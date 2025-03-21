import path from "node:path";
import { getOriginShieldRegion } from "./origin-shield.js";

import * as dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Stack Parameters
export const getConfig = (): ConfigProps => {
	const baseName = "imgproxy";
	const stackNameDefault = `${baseName}-stack`;
	const lambdaFunctionNameDefault = `${stackNameDefault}_${baseName}-lamdba`;
	const lambdaEcrRepositoryNameDefault = baseName;

	return {
		// STACK
		STACK_NAME: process.env.CDK_STACK_NAME || stackNameDefault,

		// IMGPROXY
		ENABLE_PRO_OPTIONS: parseBoolean(process.env.ENABLE_PRO_OPTIONS) ?? false,
		ENABLE_URL_SIGNING: parseBoolean(process.env.ENABLE_URL_SIGNING) ?? true,
		// LAMBDA
		LAMBDA_FUNCTION_NAME: process.env.IMGPROXY_FUNCTION_NAME || lambdaFunctionNameDefault,
		LAMBDA_ECR_REPOSITORY_NAME: process.env.LAMBDA_ECR_REPOSITORY_NAME || lambdaEcrRepositoryNameDefault,
		LAMBDA_ARCHITECTURE: process.env.IMGPROXY_ARCHITECTURE || "ARM64",
		LAMBDA_MEMORY_SIZE: parseNumber(process.env.IMGPROXY_MEMORY_SIZE, 2048),
		LAMBDA_TIMEOUT: parseNumber(process.env.IMGPROXY_TIMEOUT, 60),
		// SSM
		SYSTEMS_MANAGER_PARAMETERS_BASE_PATH: process.env.SYSTEMS_MANAGER_PARAMETERS_PATH || process.env.STACK_NAME || stackNameDefault,
		// S3
		S3_CREATE_DEFAULT_BUCKETS: parseBoolean(process.env.S3_CREATE_DEFAULT_BUCKETS) ?? false,
		S3_CREATE_BUCKETS: parseArray(process.env.S3_CREATE_BUCKETS),
		S3_EXISTING_OBJECT_ARNS: parseArray(process.env.S3_ACCESSIBLE_OBJECT_ARNS),
		S3_ASSUME_ROLE_ARN: process.env.S3_ASSUME_ROLE_ARN || undefined,
		S3_MULTI_REGION: parseBoolean(process.env.S3_MULTI_REGION) ?? false,
		S3_CLIENT_SIDE_DECRYPTION: parseBoolean(process.env.S3_CLIENT_SIDE_DECRYPTION) ?? false,
		// CLOUDFRONT
		CREATE_CLOUD_FRONT_DISTRIBUTION: parseBoolean(process.env.CREATE_CLOUD_FRONT_DISTRIBUTION) ?? true,
		CREATE_CLOUD_FRONT_URL_REWRITE_FUNCTION: parseBoolean(process.env.CREATE_CLOUD_FRONT_URL_REWRITE_FUNCTION) ?? true,
		ENABLE_STATIC_ORIGIN: parseBoolean(process.env.CREATE_CLOUD_FRONT_URL_REWRITE_FUNCTION) ?? true,
		CLOUDFRONT_ORIGIN_SHIELD_REGION: getOriginShieldRegion(process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1"),
		CLOUDFRONT_CORS_ENABLED: parseBoolean(process.env.CLOUDFRONT_CORS_ENABLED) ?? true,
		// SAMPLE
		DEPLOY_SAMPLE_WEBSITE: parseBoolean(process.env.DEPLOY_SAMPLE_WEBSITE) ?? false,
	};
};

export function parseNumber(str: string | undefined, fallback: number): number {
	if (!str) return fallback;

	const int = Number.parseInt(str, 10);

	return Number.isNaN(int) ? fallback : int;
}

export function parseBoolean(str: string | undefined): boolean | undefined {
	const TRUTHY = ["1", "yes", "y", "t", "true"];
	const FALSY = ["0", "no", "n", "f", "false"];

	const _str = str?.trim().toLocaleLowerCase();

	if (_str === undefined || _str.length === 0) {
		return;
	}

	if (TRUTHY.includes(_str)) {
		return true;
	}

	if (FALSY.includes(_str)) {
		return false;
	}

	return;
}

export function parseArray(str: string | undefined): string[] {
	if (str === undefined || str?.trim() === "") {
		return [];
	}

	return str.split(",").map((s) => s.trim()).filter((s) => s !== "");
}

export type ConfigProps = {
	// S T A C K
	//
	/**
	 * The name of the deployed AWS stack.
	 */
	readonly STACK_NAME: string;

	// I M G P R O X Y
	//
	/**
	 * Enable URL signing for imgproxy urls: If true will set IMGPROXY_KEY and IMGPROXY_SALT in SSM (and KVS if CREATE_CLOUD_FRONT_URL_REWRITE_FUNCTION is true). Values will be pulled from .imgproxy.env if set otherwise default values will be generated using `/dev/urandom`
	 * @default true
	 */
	readonly ENABLE_URL_SIGNING: boolean;
	/**
	 * Enable imgproxy `PRO` options. If false and url-rewrite is enabled pro options will be stripped from the processing URI
	 * @default false
	 */
	readonly ENABLE_PRO_OPTIONS: boolean;

	// A W S
	//
	// LAMBDA
	/**
	 * The name of the ECR repository which contains the image to use for the function. The image must be in an Amazon Elastic Container Registry (Amazon ECR) repository.
	 * @default  `${BASE_NAME}`
	 */
	readonly LAMBDA_ECR_REPOSITORY_NAME: string;
	/**
	 * A name for the function. If you don't specify a name, stack name is used.
	 * @default `${BASE_NAME}-lambda`
	 */
	readonly LAMBDA_FUNCTION_NAME: string;
	/**
	 * !!!WARNING!!!: ML features do not work on ARM64 architecture due to Lambda environment limitations. If you need ML features, either use AMD64 architecture or consider deploying imgproxy on ECS or EKS.
	 * @default "ARM64"
	 */
	readonly LAMBDA_ARCHITECTURE: string;
	/**
	 * Amount of memory in megabytes to give to the function. AWS Lambda will allocate CPU power linearly in proportion to the amount of memory configured, so it's recommended to allocate at least 2048 MB of memory to the function.
	 * @default 2048
	 */
	readonly LAMBDA_MEMORY_SIZE: number;
	/**
	 * The amount of time in seconds that Lambda allows a function to run before stopping it.
	 * @default 60
	 */
	readonly LAMBDA_TIMEOUT: number;

	// SSM
	/**
	 * A path of AWS Systems Manager Parameter Store parameters that should be loaded as environment variables. The path should _NOT_ start with a slash (/) nor should it have a slash (/) at the end. For example, if you want to load the `IMGPROXY_KEY` variable from the `/imgproxy/prod/IMGPROXY_KEY` parameter, the value should be `imgproxy/prod`. If not set, imgproxy will load environment variables from the `/${StackName}` path.
	 * @default STACK_NAME
	 */
	readonly SYSTEMS_MANAGER_PARAMETERS_BASE_PATH: string;

	// S3
	/**
	 * Whether to create default image buckets for imgproxy to access. If `true` a bucket named `${STACK_NAME}-images` will be created and imgproxy will be given access to all containing objects.
	 * @default false
	 */
	readonly S3_CREATE_DEFAULT_BUCKETS: boolean;
	/**
	 * Names of S3 buckets that should be created during deployment. ARNs giving access to all objects in these buckets will be added to `S3_ACCESSIBLE_OBJECT_ARNS`. ie. `arn:aws:s3:::${CREATE_BUCKET_NAME}/*`
	 * @default []
	 */
	readonly S3_CREATE_BUCKETS: string[];
	/**
	 * ARNs of S3 objects (acomma delimited) that imgproxy should have access to. You can grant access to multiple objects with a single ARN by using wildcards. Example: `arn:aws:s3:::my-images-bucket/*,arn:aws:s3:::my-assets-bucket/images/*`
	 * @default []
	 */
	readonly S3_EXISTING_OBJECT_ARNS: string[];
	/**
	 * ARN of IAM Role that S3 client should assume. This allows you to provide imgproxy access to third-party S3 buckets that the assummed IAM Role has access to
	 * @default undefined
	 */
	readonly S3_ASSUME_ROLE_ARN?: string | undefined;
	/**
	 * Should imgproxy be able to access S3 buckets in other regions? By default, imgproxy can access only S3 buckets located in the same region as imgproxy
	 * @default false
	 */
	readonly S3_MULTI_REGION: boolean;
	/**
	 * Should imgproxy use S3 decryption client? The decryption client will be used for all objects in all S3 buckets, so unecrypted objects won't be accessible
	 * @default false
	 */
	readonly S3_CLIENT_SIDE_DECRYPTION: boolean;

	// CLOUDFRONT
	/**
	 * Create a CloudFront distribution to cache Lambda responses?
	 * @default true
	 */
	readonly CREATE_CLOUD_FRONT_DISTRIBUTION: boolean;
	/**
	 * Create a CloudFront function that rewrites the incoming URL to maximize cache hits?
	 * @default true
	 */
	readonly CREATE_CLOUD_FRONT_URL_REWRITE_FUNCTION: boolean;
	/**
	 * If `true` a second CloudFront S3 origin will be created and paths starting with `"/static/*"` will be routed to it.
	 * @default true
	 */
	readonly ENABLE_STATIC_ORIGIN: boolean;
	/**
	 * Origin shield region. Setting the path automatically enables OriginShield. To disable it again one must explicity set `origin_shield_enabled` to false. Enabling Origin shield incurs extra costs on top of CloudFront base prices. see; https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html#:~:text=To%20enable%20Origin%20Shield%2C%20change,best%20performance%20for%20that%20origin.
	 * @default "us-east-1"
	 */
	readonly CLOUDFRONT_ORIGIN_SHIELD_REGION: string;
	/**
	 * Whether to create a second S3 bucket to store tranformed images
	 * @default true
	 */
	readonly CLOUDFRONT_CORS_ENABLED: boolean;

	// S A M P L E
	/**
	 * Whether to deploy a second CloudFront distribution displaying sample images
	 * @default false
	 */
	readonly DEPLOY_SAMPLE_WEBSITE: boolean;
};
