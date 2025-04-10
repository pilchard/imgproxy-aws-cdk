import {
	aws_cloudfront as cloudfront,
	aws_cloudfront_origins as origins,
	aws_ecr as ecr,
	aws_iam as iam,
	aws_lambda as lambda,
	aws_logs as logs,
	aws_s3 as s3,
	aws_s3_deployment as s3deploy,
	aws_ssm as ssm,
	CfnOutput,
	Duration,
	Fn,
	RemovalPolicy,
	Stack,
} from "aws-cdk-lib";

import type { StackProps } from "aws-cdk-lib";
import type { CfnDistribution, ICachePolicy } from "aws-cdk-lib/aws-cloudfront";
import type { Construct } from "constructs";
import type { ConfigProps } from "../bin/config";

export type ImgproxyLambdaEnv = {
	PORT: string;
	IMGPROXY_LOG_FORMAT: "pretty" | "json" | "structured" | "gcp";
	IMGPROXY_ENV_AWS_SSM_PARAMETERS_PATH: string;
	IMGPROXY_USE_S3: string;
	IMGPROXY_S3_ASSUME_ROLE_ARN?: string;
	IMGPROXY_S3_MULTI_REGION?: string;
	IMGPROXY_S3_USE_DECRYPTION_CLIENT?: string;
	IMGPROXY_PATH_PREFIX?: string;
	IMGPROXY_CLOUD_WATCH_SERVICE_NAME: string;
	IMGPROXY_CLOUD_WATCH_NAMESPACE: string;
	IMGPROXY_CLOUD_WATCH_REGION: string;
};

const archMap: Record<string, lambda.Architecture> = {
	ARM64: lambda.Architecture.ARM_64,
	AMD64: lambda.Architecture.X86_64,
};

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
		const {
			config: {
				/** S T A C K */
				STACK_NAME,
				// CDK_STACK_BASE_NAME,
				/** I M G P R O X Y */
				// ENABLE_URL_SIGNING,
				/** L A M B D A */
				LAMBDA_FUNCTION_NAME,
				LAMBDA_ECR_REPOSITORY_NAME,
				LAMBDA_ARCHITECTURE,
				LAMBDA_MEMORY_SIZE,
				LAMBDA_TIMEOUT,
				LAMBDA_SSM_PARAMETERS,
				/** S S M */
				SYSTEMS_MANAGER_PARAMETERS_PATH,
				/** S 3 */
				S3_CREATE_DEFAULT_BUCKETS,
				S3_CREATE_BUCKETS,
				S3_EXISTING_OBJECT_ARNS,
				S3_ASSUME_ROLE_ARN,
				S3_MULTI_REGION,
				S3_CLIENT_SIDE_DECRYPTION,
				/** C L O U D F R O N T */
				CREATE_CLOUD_FRONT_DISTRIBUTION,
				CLOUDFRONT_ORIGIN_SHIELD_REGION,
				CLOUDFRONT_CORS_ENABLED,
				/** C L O U D F R O N T  F U N C T I O N*/
				CREATE_URL_REWRITE_CLOUD_FRONT_FUNCTION,
				URL_REWRITE_CLOUD_FRONT_FUNCTION_CONFIG,
				/** S A M P L E */
				DEPLOY_SAMPLE_WEBSITE,
			},
		} = props;

		/**
		 * Create and collect S3 buckets
		 */
		const accessibleS3Buckets: s3.IBucket[] = [];

		// Default
		if (S3_CREATE_DEFAULT_BUCKETS) {
			const defaultBucket = new s3.Bucket(this, `${STACK_NAME}_imgproxy-source-bucket`, {
				removalPolicy: RemovalPolicy.RETAIN,
				blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
				encryption: s3.BucketEncryption.S3_MANAGED,
				enforceSSL: true,
				autoDeleteObjects: false,
			});

			accessibleS3Buckets.push(defaultBucket);

			new CfnOutput(this, "DefaultS3Buckets", {
				description: "Generated S3 default buckets",
				value: defaultBucket.bucketName,
			});
		}

		// Create
		if (S3_CREATE_BUCKETS.length > 0) {
			for (const s3BucketName of S3_CREATE_BUCKETS) {
				const bucketId = `${s3BucketName}_${this.node.addr}`;
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

			new CfnOutput(this, "CreatedS3Buckets", {
				description: "Created S3 Buckets",
				value: `Created ${accessibleS3Buckets.length} buckets: [${
					accessibleS3Buckets.map((o) => o.bucketName).join(", ")
				}]`,
			});
		}

		/**
		 * Sample website
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
			resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/${SYSTEMS_MANAGER_PARAMETERS_PATH}`],
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
		imgproxyLambdaRole.attachInlinePolicy(
			new iam.Policy(this, "read-write-bucket-policy", { statements: iamPolicyStatements }),
		);

		// Function
		//
		// imgproxy Environment
		const imgproxyLambdaEnvironment: ImgproxyLambdaEnv = {
			// Imgproxy
			PORT: "8080",
			IMGPROXY_LOG_FORMAT: "json",
			// AWS - SSM
			IMGPROXY_ENV_AWS_SSM_PARAMETERS_PATH: SYSTEMS_MANAGER_PARAMETERS_PATH,
			// AWS - CloudWatch
			IMGPROXY_CLOUD_WATCH_SERVICE_NAME: LAMBDA_FUNCTION_NAME,
			IMGPROXY_CLOUD_WATCH_NAMESPACE: LAMBDA_FUNCTION_NAME,
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
					`imgproxy-ecr-repository_${this.node.addr}`,
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

		const imgproxyLambda = new lambda.Function(this, `imgproxy-lambda_${this.node.addr}`, imgproxyLambdaProps);

		// Configure SSM Parameters for Lambda
		// @see https://community.aws/content/2lhjUrhqpbrQKNkc6lOevb3qwyU/using-ssm-parameters-in-aws-cdk?lang=en#create-an-ssm-parameter-with-cdk
		for (const [parameter, value] of Object.entries(LAMBDA_SSM_PARAMETERS)) {
			const parameterName = `/${SYSTEMS_MANAGER_PARAMETERS_PATH}/${parameter}`;
			new ssm.StringParameter(this, parameterName, { parameterName: parameterName, stringValue: value });
		}

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
			const imgproxyCloudFrontCachePolicy = new cloudfront.CachePolicy(
				this,
				`image_cache_policy_${this.node.addr}`,
				{
					defaultTtl: Duration.days(365),
					maxTtl: Duration.days(365),
					minTtl: Duration.seconds(0),
					enableAcceptEncodingBrotli: false,
					enableAcceptEncodingGzip: false,
					cookieBehavior: cloudfront.CacheCookieBehavior.none(),
					headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Accept"),
					queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
				},
			);

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
			if (CREATE_URL_REWRITE_CLOUD_FRONT_FUNCTION) {
				/**
				 * Create KeyValueStore and a parameters
				 * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.KeyValueStore.html
				 * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.ImportSource.html
				 */
				const urlRewriteStore = new cloudfront.KeyValueStore(this, "urlRewriteStore", {
					keyValueStoreName: `${STACK_NAME}_url-rewrite-store`,
					source: cloudfront.ImportSource.fromInline(JSON.stringify(URL_REWRITE_CLOUD_FRONT_FUNCTION_CONFIG)),
				});

				const urlRewriteFunction = new cloudfront.Function(this, "urlRewrite", {
					functionName: `${STACK_NAME}_url-rewrite`,
					code: cloudfront.FunctionCode.fromFile({ filePath: ".dist/functions/url-rewrite/index.js" }),
					runtime: cloudfront.FunctionRuntime.JS_2_0,
					keyValueStore: urlRewriteStore,
				});

				imageDeliveryCacheBehaviorConfig.functionAssociations.push({
					eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
					function: urlRewriteFunction,
				});
			}

			// CORS
			if (CLOUDFRONT_CORS_ENABLED) {
				// Creating a custom response headers policy. CORS allowed for all origins.
				const imageResponseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
					this,
					`ResponseHeadersPolicy${this.node.addr}`,
					{
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
					},
				);
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
			cfnImageDelivery.addPropertyOverride(
				"DistributionConfig.Origins.0.OriginAccessControlId",
				oac.getAtt("Id"),
			);

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
