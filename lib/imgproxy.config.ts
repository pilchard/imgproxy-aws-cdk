import { parseArray, parseBoolean, parseNumber } from "./config";
import { getOriginShieldRegion } from "./origin-shield";

export type ImgproxyLambdaEnv = {
	PORT: string;
	IMGPROXY_LOG_FORMAT: "prety" | "json" | "structured" | "gcp";
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

const baseName = "imgproxy";
const stackNameDefault = `${baseName}-stack`;
const lambdaFunctionNameDefault = `${stackNameDefault}_${baseName}-lamdba`;
const lambdaEcrRepositoryNameDefault = baseName;
const SYSTEMS_MANAGER_PARAMETERS_BASE_PATH =
	process.env.SYSTEMS_MANAGER_PARAMETERS_PATH || process.env.STACK_NAME || stackNameDefault;

export const config = {
	// STACK
	cdk: {
		stackName: "imgproxy",
		account: "",
		region: "",
	},
	// IMGPROXY
	imgproxy: {
		proOptions: false,
		urlSigning: true,
		environment: {
			file: ".imgproxy.env",
		},
	},

	// LAMBDA
	lambda: {
		functionName: process.env.IMGPROXY_FUNCTION_NAME || lambdaFunctionNameDefault,
		ecrRepositoryName: process.env.LAMBDA_ECR_REPOSITORY_NAME || lambdaEcrRepositoryNameDefault,
		architecture: process.env.IMGPROXY_ARCHITECTURE || "ARM64",
		memorySize: parseNumber(process.env.IMGPROXY_MEMORY_SIZE, 2048),
		timeout: parseNumber(process.env.IMGPROXY_TIMEOUT, 60),
	},
	// SSM
	SYSTEMS_MANAGER_PARAMETERS_BASE_PATH:
		process.env.SYSTEMS_MANAGER_PARAMETERS_PATH || process.env.STACK_NAME || stackNameDefault,
	// S3
	s3: {
		createDefaultBuckets: true,
		createCustomBuckets: [],
		existingObjectArns: [],
		assumeRoleArn: "",
		enableMultiRegion: false,
		enableClientSideDecryption: false,
	},
	// CLOUDFRONT
	cloudfront: {
		createCloudFrontDistribution: true,
		enableCloudFrontFunctionUrlRewrite: true,
		originShieldRegion: getOriginShieldRegion(
			process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1",
		),
		corsEnabled: parseBoolean(process.env.CLOUDFRONT_CORS_ENABLED) ?? true,
	},
	// SAMPLE
	sample: {
		ampleWebsite: false,
	},
};
