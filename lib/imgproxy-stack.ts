// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
	aws_cloudfront as cloudfront,
	aws_cloudfront_origins as origins,
	aws_ecr as ecr,
	aws_iam as iam,
	aws_lambda as lambda,
	aws_logs as logs,
	aws_s3 as s3,
	aws_s3_deployment as s3deploy,
	CfnOutput,
	Duration,
	Fn,
	RemovalPolicy,
	Stack,
} from "aws-cdk-lib";

import type { StackProps } from "aws-cdk-lib";
import type { CfnDistribution, ICachePolicy } from "aws-cdk-lib/aws-cloudfront";
import type { Construct } from "constructs";
import type { ConfigProps } from "./config";
import type { ImgproxyLambdaEnv } from "./imgproxy.config";

const archMap: Record<string, lambda.Architecture> = { ARM64: lambda.Architecture.ARM_64, AMD64: lambda.Architecture.X86_64 };

type ImageDeliveryCacheBehaviorConfig = {
	origin: origins.OriginGroup | origins.HttpOrigin;
	compress: boolean;
	viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy;
	cachePolicy: ICachePolicy;
	functionAssociations: Array<{ eventType: cloudfront.FunctionEventType; function: cloudfront.Function; }>;
	responseHeadersPolicy?: cloudfront.ResponseHeadersPolicy;
};

export type AwsEnvStackProps = StackProps & { config: Readonly<ConfigProps>; };

export class ImgproxyStack extends Stack {
	constructor(scope: Construct, id: string, props: AwsEnvStackProps) {
		super(scope, id, props);

		/** */

		const {
			config: {
				STACK_NAME,
				// IMGPROXY
				ENABLE_PRO_OPTIONS,
				ENABLE_URL_SIGNING,
				// LAMBDA
				LAMBDA_FUNCTION_NAME,
				LAMBDA_ECR_REPOSITORY_NAME,
				LAMBDA_ARCHITECTURE,
				LAMBDA_MEMORY_SIZE,
				LAMBDA_TIMEOUT,
				// SSM
				SYSTEMS_MANAGER_PARAMETERS_BASE_PATH,
				// S3,
				S3_CREATE_DEFAULT_BUCKETS,
				S3_CREATE_BUCKETS,
				S3_EXISTING_OBJECT_ARNS,
				S3_ASSUME_ROLE_ARN,
				S3_MULTI_REGION,
				S3_CLIENT_SIDE_DECRYPTION,
				// CLOUDFRONT
				CREATE_CLOUD_FRONT_URL_REWRITE_FUNCTION,
				CREATE_CLOUD_FRONT_DISTRIBUTION,
				CLOUDFRONT_ORIGIN_SHIELD_REGION,
				CLOUDFRONT_CORS_ENABLED,
				// SAMPLE
				DEPLOY_SAMPLE_WEBSITE,
			},
		} = props;

		/**
		 * Create and collect S3 buckets
		 */
		const accessibleS3Buckets: s3.IBucket[] = [];

		// Default
		if (S3_CREATE_DEFAULT_BUCKETS) {
			const defaultBucket = new s3.Bucket(this, "stack-generated-default-bucket", {
				bucketName: `${this.stackName.toLocaleLowerCase()}-bucket`,
				removalPolicy: RemovalPolicy.RETAIN,
				blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
				encryption: s3.BucketEncryption.S3_MANAGED,
				enforceSSL: true,
				autoDeleteObjects: false,
			});

			accessibleS3Buckets.push(defaultBucket);

			new CfnOutput(this, "OriginalImagesS3Bucket", { description: "S3 default bucket", value: defaultBucket.bucketName });
		}

		// Create
		if (S3_CREATE_BUCKETS.length > 0) {
			for (const s3BucketName of S3_CREATE_BUCKETS) {
				const bucketId = `stack-generated-bucket-${s3BucketName}`;
				const bucket = new s3.Bucket(this, bucketId, {
					bucketName: s3BucketName,
					removalPolicy: RemovalPolicy.RETAIN,
					blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
					encryption: s3.BucketEncryption.S3_MANAGED,
					enforceSSL: true,
					autoDeleteObjects: false,
				});

				accessibleS3Buckets.push(bucket);
			}

			new CfnOutput(this, "OriginalImagesS3Bucket", {
				description: "S3 bucket where original images are stored",
				value: `Created ${accessibleS3Buckets.length} buckets: [${accessibleS3Buckets.map((o) => o.bucketName).join(", ")}]`,
			});
		}

		/**
		 * Sampe website
		 */
		if (DEPLOY_SAMPLE_WEBSITE) {
			const sampleWebsiteBucket = new s3.Bucket(this, "s3-sample-website-bucket", {
				removalPolicy: RemovalPolicy.DESTROY,
				blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
				encryption: s3.BucketEncryption.S3_MANAGED,
				enforceSSL: true,
				autoDeleteObjects: true,
			});

			new s3deploy.BucketDeployment(this, "DeployWebsite", {
				sources: [s3deploy.Source.asset("./image-sample")],
				destinationBucket: sampleWebsiteBucket,
				destinationKeyPrefix: "images/sample/",
			});

			accessibleS3Buckets.push(sampleWebsiteBucket);

			const sampleWebsiteDelivery = new cloudfront.Distribution(this, "websiteDeliveryDistribution", {
				comment: "imgproxy - sample website",
				defaultRootObject: "index.html",
				defaultBehavior: {
					origin: origins.S3BucketOrigin.withOriginAccessControl(sampleWebsiteBucket),
					viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				},
			});

			new CfnOutput(this, "SampleWebsiteDomain", {
				description: "Sample website domain",
				value: sampleWebsiteDelivery.distributionDomainName,
			});
			new CfnOutput(this, "SampleWebsiteS3Bucket", {
				description: "S3 bucket use by the sample website",
				value: sampleWebsiteBucket.bucketName,
			});
		}

		/**
		 * Lambda
		 */

		const imgproxyEnvAwsSsmParametersPath = `${SYSTEMS_MANAGER_PARAMETERS_BASE_PATH}/imgproxy`;

		// Role
		//
		const imgproxyLambdaRole = new iam.Role(this, "imgproxy-lamda-role", {
			assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
				iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXrayWriteOnlyAccess"),
			],
		});

		// IAM policy statements to attach to LambdaRole
		const iamPolicyStatements: iam.PolicyStatement[] = [];

		// CloudWatch Policy
		const cloudWatchAccessPolicy = new iam.PolicyStatement({
			sid: "CloudWatch",
			effect: iam.Effect.ALLOW,
			actions: ["cloudwatch:PutMetricData", "cloudwatch:PutMetricStream"],
			resources: ["*"],
		});
		iamPolicyStatements.push(cloudWatchAccessPolicy);

		// SystemManager Policy
		const systemManagerAccessPolicy = new iam.PolicyStatement({
			sid: "SystemsManagerAccess",
			effect: iam.Effect.ALLOW,
			actions: ["ssm:GetParametersByPath"],
			resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter${imgproxyEnvAwsSsmParametersPath}`],
		});
		iamPolicyStatements.push(systemManagerAccessPolicy);

		// S3 Bucket access - `${arn:aws:s3:::saltine-s3-sandbox-images}/*`
		const s3AccessibleObjectArns: string[] = [];

		for (const arn of S3_EXISTING_OBJECT_ARNS) {
			s3AccessibleObjectArns.push(arn);
		}

		for (const bucket of accessibleS3Buckets) {
			s3AccessibleObjectArns.push(`${bucket.bucketArn}/*`);
		}

		if (s3AccessibleObjectArns.length > 0) {
			const s3AccessPolicy = new iam.PolicyStatement({
				sid: "S3Access",
				effect: iam.Effect.ALLOW,
				actions: ["s3:GetObject", "s3:GetObjectVersion"],
				resources: s3AccessibleObjectArns,
			});
			iamPolicyStatements.push(s3AccessPolicy);
		}

		// S3 Assume Role Policy
		if (S3_ASSUME_ROLE_ARN) {
			const s3AssumeRolePolicy = new iam.PolicyStatement({
				sid: "IAMRoleAssume",
				effect: iam.Effect.ALLOW,
				actions: ["sts:AssumeRole"],
				resources: [S3_ASSUME_ROLE_ARN],
			});
			iamPolicyStatements.push(s3AssumeRolePolicy);
		}

		// S3 Client Side Decryption Policy
		if (S3_CLIENT_SIDE_DECRYPTION) {
			const s3ClientSideDecryptPolicy = new iam.PolicyStatement({
				sid: "KMSDecrypt",
				effect: iam.Effect.ALLOW,
				actions: ["kms:Decrypt"],
				resources: [`arn:aws:kms:*:${this.account}:key/*`],
			});
			iamPolicyStatements.push(s3ClientSideDecryptPolicy);
		}

		// IAM attach policy to the role assumed by Lambda
		imgproxyLambdaRole.attachInlinePolicy(new iam.Policy(this, "read-write-bucket-policy", { statements: iamPolicyStatements }));

		// Function
		//
		// imgproxy Environment
		const imgproxyLambdaEnvironment: ImgproxyLambdaEnv = {
			// Imgproxy
			PORT: "8080",
			IMGPROXY_LOG_FORMAT: "json",
			// AWS - SSM
			IMGPROXY_ENV_AWS_SSM_PARAMETERS_PATH: imgproxyEnvAwsSsmParametersPath,
			// AWS - CloudWatch
			IMGPROXY_CLOUD_WATCH_SERVICE_NAME: LAMBDA_FUNCTION_NAME,
			IMGPROXY_CLOUD_WATCH_NAMESPACE: "imgproxy",
			IMGPROXY_CLOUD_WATCH_REGION: this.region,
			// AWS - S3
			IMGPROXY_USE_S3: "1",
			...(S3_MULTI_REGION ? { IMGPROXY_S3_MULTI_REGION: "1" } : {}),
			...(S3_CLIENT_SIDE_DECRYPTION ? { IMGPROXY_S3_USE_DECRYPTION_CLIENT: "1" } : {}),
			...(S3_ASSUME_ROLE_ARN !== undefined ? { IMGPROXY_S3_ASSUME_ROLE_ARN: S3_ASSUME_ROLE_ARN } : {}),
		};

		// Props
		const imgproxyLambdaProps: lambda.FunctionProps = {
			runtime: lambda.Runtime.FROM_IMAGE,
			handler: lambda.Handler.FROM_IMAGE,
			code: lambda.Code.fromEcrImage(
				ecr.Repository.fromRepositoryArn(
					this,
					"imgproxy-ecr-repository",
					`arn:aws:ecr:${this.region}:${this.account}:repository/${LAMBDA_ECR_REPOSITORY_NAME}`,
				),
			),
			functionName: LAMBDA_FUNCTION_NAME,
			memorySize: LAMBDA_MEMORY_SIZE,
			role: imgproxyLambdaRole,
			timeout: Duration.seconds(LAMBDA_TIMEOUT),
			environment: imgproxyLambdaEnvironment,
			tracing: lambda.Tracing.ACTIVE,
			architecture: archMap[LAMBDA_ARCHITECTURE] ?? lambda.Architecture.ARM_64,
			loggingFormat: lambda.LoggingFormat.JSON,
			logRetention: logs.RetentionDays.ONE_DAY,
		};

		const imgproxyLambda = new lambda.Function(this, "imgproxy", imgproxyLambdaProps);

		// Enable Lambda URL
		const imgproxyLambdaURL = imgproxyLambda.addFunctionUrl({
			authType: lambda.FunctionUrlAuthType.AWS_IAM,
			invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
		});

		/**
		 * Create Cloudfront Distribution
		 */
		if (CREATE_CLOUD_FRONT_DISTRIBUTION) {
			// Cache policy
			const imgproxyCloudFrontCachePolicy = new cloudfront.CachePolicy(this, `ImageCachePolicy${this.node.addr}`, {
				defaultTtl: Duration.days(365),
				maxTtl: Duration.days(365),
				minTtl: Duration.seconds(0),
				enableAcceptEncodingBrotli: false,
				enableAcceptEncodingGzip: false,
				cookieBehavior: cloudfront.CacheCookieBehavior.none(),
				headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Accept"),
				queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
			});

			// Origin
			const imgproxyLambdaDomainName = Fn.parseDomainName(imgproxyLambdaURL.url);

			const imgproxyLambdaOriginOptions: origins.HttpOriginProps = {
				...(CLOUDFRONT_ORIGIN_SHIELD_REGION ? { originShieldRegion: CLOUDFRONT_ORIGIN_SHIELD_REGION } : {}),
			};

			const imgproxyLambdaOrigin = new origins.HttpOrigin(imgproxyLambdaDomainName, imgproxyLambdaOriginOptions);

			const imageDeliveryCacheBehaviorConfig: ImageDeliveryCacheBehaviorConfig = {
				origin: imgproxyLambdaOrigin,
				viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				compress: false,
				cachePolicy: imgproxyCloudFrontCachePolicy,
				functionAssociations: [],
			};

			/**
			 *  Create a CloudFront Function for url rewrites
			 */
			if (CREATE_CLOUD_FRONT_URL_REWRITE_FUNCTION) {
				/**
				 * TODO Create KeyValueStore and a parameters
				 * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.KeyValueStore.html
				 * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.ImportSource.html
				 */
				const urlRewritStore = new cloudfront.KeyValueStore(this, "urlRewritStore");

				const urlRewriteFunction = new cloudfront.Function(this, "urlRewrite", {
					functionName: `urlRewrite${this.node.addr}`,
					code: cloudfront.FunctionCode.fromFile({ filePath: "functions/url-rewrite/index.min.js" }),
					runtime: cloudfront.FunctionRuntime.JS_2_0,
					keyValueStore: urlRewritStore,
				});

				imageDeliveryCacheBehaviorConfig.functionAssociations.push({
					eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
					function: urlRewriteFunction,
				});
			}

			// CORS
			if (CLOUDFRONT_CORS_ENABLED) {
				// Creating a custom response headers policy. CORS allowed for all origins.
				const imageResponseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, `ResponseHeadersPolicy${this.node.addr}`, {
					responseHeadersPolicyName: `ImageResponsePolicy${this.node.addr}`,
					corsBehavior: {
						accessControlAllowCredentials: false,
						accessControlAllowHeaders: ["*"],
						accessControlAllowMethods: ["GET"],
						accessControlAllowOrigins: ["*"],
						accessControlMaxAge: Duration.seconds(600),
						originOverride: false,
					},
					// recognizing image requests that were processed by this solution
					customHeadersBehavior: {
						customHeaders: [{ header: "x-aws-imgproxy", value: "v1.0", override: true }, {
							header: "vary",
							value: "accept",
							override: true,
						}],
					},
				});
				imageDeliveryCacheBehaviorConfig.responseHeadersPolicy = imageResponseHeadersPolicy;
			}

			const imageDelivery = new cloudfront.Distribution(this, "imageDeliveryDistribution", {
				comment: "imgproxy - image delivery",
				defaultBehavior: imageDeliveryCacheBehaviorConfig,
			});

			// Add OAC between CloudFront and LambdaURL
			const oac = new cloudfront.CfnOriginAccessControl(this, "OAC", {
				originAccessControlConfig: {
					name: `oac${this.node.addr}`,
					originAccessControlOriginType: "lambda",
					signingBehavior: "always",
					signingProtocol: "sigv4",
				},
			});

			const cfnImageDelivery = imageDelivery.node.defaultChild as CfnDistribution;
			cfnImageDelivery.addPropertyOverride("DistributionConfig.Origins.0.OriginAccessControlId", oac.getAtt("Id"));

			imgproxyLambda.addPermission("AllowCloudFrontServicePrincipal", {
				principal: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
				action: "lambda:InvokeFunctionUrl",
				sourceArn: `arn:aws:cloudfront::${this.account}:distribution/${imageDelivery.distributionId}`,
			});

			new CfnOutput(this, "ImageDeliveryDomain", {
				description: "Domain name of image delivery",
				value: imageDelivery.distributionDomainName,
			});
		}
	}
}
