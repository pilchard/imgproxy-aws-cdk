// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
	CfnOutput,
	Duration,
	Fn,
	RemovalPolicy,
	Stack,
	aws_cloudfront as cloudfront,
	aws_ecr as ecr,
	aws_iam as iam,
	aws_lambda as lambda,
	aws_logs as logs,
	aws_cloudfront_origins as origins,
	aws_s3 as s3,
	aws_s3_deployment as s3deploy,
} from "aws-cdk-lib";

import type { StackProps } from "aws-cdk-lib";
import type { CfnDistribution, ICachePolicy } from "aws-cdk-lib/aws-cloudfront";
import type { Construct } from "constructs";
import type { ConfigProps } from "./config";

const archMap: Record<string, lambda.Architecture> = {
	ARM64: lambda.Architecture.ARM_64,
	AMD64: lambda.Architecture.X86_64,
};

type AwsEnvStackProps = StackProps & {
	config: Readonly<ConfigProps>;
};

type ImageDeliveryCacheBehaviorConfig = {
	origin: origins.OriginGroup | origins.HttpOrigin;
	compress: boolean;
	viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy;
	cachePolicy: ICachePolicy;
	functionAssociations: Array<{
		eventType: cloudfront.FunctionEventType;
		function: cloudfront.Function;
	}>;
	responseHeadersPolicy?: cloudfront.ResponseHeadersPolicy;
};

type LambdaEnv = {
	originalImageBucketName: string;
	transformedImageBucketName?: string;
	transformedImageCacheTTL: string;
	maxImageSize: string;
};

export class ImageOptimizationStack extends Stack {
	constructor(scope: Construct, id: string, props: AwsEnvStackProps) {
		super(scope, id, props);

		// ImgproxyOptimization props

		const {
			config: {
				LAMBDA_FUNCTION_NAME,
				LAMBDA_IMAGE_URI,
				LAMBDA_ARCHITECTURE,
				LAMBDA_MEMORY_SIZE,
				LAMBDA_TIMEOUT,
				// SSM
				SYSTEMS_MANAGER_PARAMETERS_PATH,
				// S3
				S3_CREATE_DEFAULT_BUCKETS,
				S3_CREATE_BUCKETS,
				S3_EXISTING_OBJECT_ARNS,
				S3_ASSUME_ROLE_ARN,
				S3_MULTI_REGION,
				S3_CLIENT_SIDE_DECRYPTION,
				PATH_PREFIX,
				// CLOUDFRONT
				CREATE_CLOUD_FRONT_DISTRIBUTION,
				CLOUDFRONT_ORIGIN_SHIELD_REGION,
				CLOUDFRONT_CORS_ENABLED,
				// SAMPLE
				DEPLOY_SAMPLE_WEBSITE,
			},
		} = props;

		// For the bucket having original images, either use an external one, or create one with some samples photos.
		const accessibleS3Buckets: s3.IBucket[] = [];

		if (S3_CREATE_BUCKETS.length > 0) {
			for (const s3BucketName of S3_CREATE_BUCKETS) {
				const bucket = new s3.Bucket(this, `stack-generated-bucket-${s3BucketName}`, {
					bucketName: s3BucketName,
					removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
					blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
					encryption: s3.BucketEncryption.S3_MANAGED,
					enforceSSL: true,
					autoDeleteObjects: true,
				});

				accessibleS3Buckets.push(bucket);
			}

			new CfnOutput(this, "OriginalImagesS3Bucket", {
				description: "S3 bucket where original images are stored",
				value: `Created ${accessibleS3Buckets.length} buckets: [${accessibleS3Buckets.map((o) => o.bucketName).join(", ")}]`,
			});
		} else if (S3_CREATE_DEFAULT_BUCKETS) {
			const defaultBucket = new s3.Bucket(this, "stack-generated-default-bucket", {
				bucketName: `${this.stackName}-image-bucket`,
				removalPolicy: RemovalPolicy.DESTROY,
				blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
				encryption: s3.BucketEncryption.S3_MANAGED,
				enforceSSL: true,
				autoDeleteObjects: true,
			});

			accessibleS3Buckets.push(defaultBucket);

			new CfnOutput(this, "OriginalImagesS3Bucket", {
				description: "S3 bucket where original images are stored",
				value: defaultBucket.bucketName,
			});
		}

		// deploy a sample website for testing if required
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

			const sampleWebsiteDelivery = new cloudfront.Distribution(
				this,
				"websiteDeliveryDistribution",
				{
					comment: "image optimization - sample website",
					defaultRootObject: "index.html",
					defaultBehavior: {
						// TODO: fix origin
						origin: new origins.S3Origin(sampleWebsiteBucket),
						viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
					},
				},
			);

			new CfnOutput(this, "SampleWebsiteDomain", {
				description: "Sample website domain",
				value: sampleWebsiteDelivery.distributionDomainName,
			});
			new CfnOutput(this, "SampleWebsiteS3Bucket", {
				description: "S3 bucket use by the sample website",
				value: sampleWebsiteBucket.bucketName,
			});
		}

		// prepare iam role for for Lambda
		const imgproxyLambdaRole = new iam.Role(this, "imgproxy-lamda-role", {
			assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaBasicExecutionRole"),
				iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXrayWriteOnlyAccess"),
			],
			inlinePolicies: {
				ImgproxyLambdaRolePolicy0: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							sid: "CloudWatch",
							effect: iam.Effect.ALLOW,
							actions: ["cloudwatch:PutMetricData", "cloudwatch:PutMetricStream"],
							resources: ["*"],
						}),
						new iam.PolicyStatement({
							sid: "SystemsManagerAccess",
							effect: iam.Effect.ALLOW,
							actions: ["ssm:GetParametersByPath"],
							resources: [
								`arn:aws:ssm:${this.region}:${this.account}:parameter/${SYSTEMS_MANAGER_PARAMETERS_PATH ?? this.stackName}`,
							],
						}),
					],
				}),
			},
		});

		// add

		// `${arn:aws:s3:::saltine-s3-sandbox-images}/*
		const s3AccessibleObjectArns = [
			...S3_EXISTING_OBJECT_ARNS,
			...accessibleS3Buckets.map((bucket) => `${bucket.bucketArn}/*`),
		];
		if (s3AccessibleObjectArns.length > 0) {
			imgproxyLambdaRole.addToPolicy(
				new iam.PolicyStatement({
					sid: "S3Access",
					effect: iam.Effect.ALLOW,
					actions: ["s3:GetObject", "s3:GetObjectVersion"],
					resources: s3AccessibleObjectArns,
				}),
			);
		}

		if (S3_ASSUME_ROLE_ARN !== undefined) {
			imgproxyLambdaRole.addToPolicy(
				new iam.PolicyStatement({
					sid: "IAMRoleAssume",
					effect: iam.Effect.ALLOW,
					actions: ["sts:AssumeRole"],
					resources: [S3_ASSUME_ROLE_ARN],
				}),
			);
		}

		if (S3_CLIENT_SIDE_DECRYPTION) {
			imgproxyLambdaRole.addToPolicy(
				new iam.PolicyStatement({
					sid: "KMSDecrypt",
					effect: iam.Effect.ALLOW,
					actions: ["kms:Decrypt"],
					resources: [`arn:aws:kms:*:${this.account}:key/*`],
				}),
			);
		}

		const imgproxyLambdaCfnRole = new iam.CfnRole(this, "imgproxy-lamda-role", {
			assumeRolePolicyDocument: {
				Version: "2012-10-17",
				Statement: [
					{
						Action: ["sts:AssumeRole"],
						Effect: "Allow",
						Principal: {
							Service: ["lambda.amazonaws.com"],
						},
					},
				],
			},
			managedPolicyArns: [
				"arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
				"arn:aws:iam::aws:policy/AWSXrayWriteOnlyAccess",
			],
			policies: [
				{
					policyName: "ImgproxyFunctionRolePolicy0",
					policyDocument: {
						Statement: [
							{
								Sid: "CloudWatch",
								Effect: "Allow",
								Action: ["cloudwatch:PutMetricData", "cloudwatch:PutMetricStream"],
								Resource: ["*"],
							},
						],
					},
				},
			],
			tags: [
				{
					key: "lambda:createdBy",
					value: "CDK",
				},
			],
		});

		// Conditions
		const deployCloudFront = CREATE_CLOUD_FRONT_DISTRIBUTION;
		const enableS3ClientSideDecryption = S3_CLIENT_SIDE_DECRYPTION;
		const enableS3MultiRegion = S3_MULTI_REGION;
		const havePathPrefix = PATH_PREFIX !== undefined;
		const haveS3AssumeRole = S3_ASSUME_ROLE_ARN !== undefined;

		// Create Lambda for image processing
		const imgproxyLambdaEnvironment = {
			PORT: "8080",
			IMGPROXY_LOG_FORMAT: "json",
			IMGPROXY_ENV_AWS_SSM_PARAMETERS_PATH: SYSTEMS_MANAGER_PARAMETERS_PATH ?? `/${this.stackName}`,
			IMGPROXY_USE_S3: "1",
			...(haveS3AssumeRole ? { IMGPROXY_S3_ASSUME_ROLE_ARN: S3_ASSUME_ROLE_ARN } : {}),
			...(enableS3MultiRegion ? { IMGPROXY_S3_MULTI_REGION: "1" } : {}),
			...(enableS3ClientSideDecryption ? { IMGPROXY_S3_USE_DECRYPTION_CLIENT: "1" } : {}),
			...(havePathPrefix ? { IMGPROXY_PATH_PREFIX: PATH_PREFIX } : {}),
			IMGPROXY_CLOUD_WATCH_SERVICE_NAME: LAMBDA_FUNCTION_NAME ?? this.stackName,
			IMGPROXY_CLOUD_WATCH_NAMESPACE: "imgproxy",
			IMGPROXY_CLOUD_WATCH_REGION: this.region,
		};

		const imgproxyLambdaProps: lambda.FunctionProps = {
			runtime: lambda.Runtime.FROM_IMAGE,
			handler: lambda.Handler.FROM_IMAGE,
			code: lambda.Code.fromEcrImage(new ecr.Repository(this, LAMBDA_IMAGE_URI)),
			functionName: LAMBDA_FUNCTION_NAME ?? this.stackName,
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
		const imgproxyLambdaURL = imgproxyLambda.addFunctionUrl();

		// Leverage CDK Intrinsics to get the hostname of the Lambda URL
		const imgproxyLambdaDomainName = Fn.parseDomainName(imgproxyLambdaURL.url);

		// Create a CloudFront origin
		const imageOrigin = new origins.HttpOrigin(imgproxyLambdaDomainName, {
			originShieldRegion: CLOUDFRONT_ORIGIN_SHIELD_REGION,
		});

		// Create a CloudFront Function for url rewrites
		const urlRewriteFunction = new cloudfront.Function(this, "urlRewrite", {
			code: cloudfront.FunctionCode.fromFile({
				filePath: "functions/url-rewrite/index.js",
			}),
			functionName: `urlRewriteFunction${this.node.addr}`,
		});

		const imgproxyCloudFrontCachePolicy: ICachePolicy = new cloudfront.CachePolicy(
			this,
			`ImageCachePolicy${this.node.addr}`,
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

		const imageDeliveryCacheBehaviorConfig: ImageDeliveryCacheBehaviorConfig = {
			origin: imageOrigin,
			viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
			compress: false,
			cachePolicy: imgproxyCloudFrontCachePolicy,
			functionAssociations: [
				{
					eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
					function: urlRewriteFunction,
				},
			],
		};

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
						customHeaders: [
							{
								header: "x-aws-imgproxy",
								value: "v1.0",
								override: true,
							},
							{ header: "vary", value: "accept", override: true },
						],
					},
				},
			);
			imageDeliveryCacheBehaviorConfig.responseHeadersPolicy = imageResponseHeadersPolicy;
		}
		const imageDelivery = new cloudfront.Distribution(this, "imageDeliveryDistribution", {
			comment: "image optimization - image delivery",
			defaultBehavior: imageDeliveryCacheBehaviorConfig,
		});

		// ADD OAC between CloudFront and LambdaURL
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
