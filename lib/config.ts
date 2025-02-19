import * as dotenv from "dotenv";
import path = require("node:path");
import { getOriginShieldRegion } from "./origin-shield";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export type ConfigProps = {
	// I M G P R O X Y

	// LAMBDA
	/**
	 * The URI of the Docker image to use for the function. The image must be in an Amazon Elastic Container Registry (Amazon ECR) repository.
	 */
	readonly LAMBDA_IMAGE_URI: string;
	/**
	 * A name for the function. If you don't specify a name, stack name is used.
	 * @default undefined
	 */
	readonly LAMBDA_FUNCTION_NAME?: string;
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
	 * @default undefined
	 */
	readonly SYSTEMS_MANAGER_PARAMETERS_PATH?: string;

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
	readonly S3_ASSUME_ROLE_ARN?: string;
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
	/**
	 * Path prefix, beginning with a slash (/).Do not add a slash (/) at the end of the path
	 * @default undefined
	 */

	// CLOUDFRONT
	readonly PATH_PREFIX?: string;
	/**
	 * Should caching CloudFront distribution be created?
	 * @default true
	 */
	readonly CREATE_CLOUD_FRONT_DISTRIBUTION: boolean;

	/**
	 * Whether to create a second S3 bucket to store tranformed images
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

// Stack Parameters
export const getConfig = (): ConfigProps => ({
	// LAMBDA
	LAMBDA_FUNCTION_NAME: process.env.IMGPROXY_FUNCTION_NAME || undefined,
	LAMBDA_IMAGE_URI: process.env.IMGPROXY_IMAGE_URI || "",
	LAMBDA_ARCHITECTURE: process.env.IMGPROXY_ARCHITECTURE || "ARM64",
	LAMBDA_MEMORY_SIZE: parseNumber(process.env.IMGPROXY_MEMORY_SIZE, 2048),
	LAMBDA_TIMEOUT: parseNumber(process.env.IMGPROXY_TIMEOUT, 60),
	// SSM
	SYSTEMS_MANAGER_PARAMETERS_PATH: process.env.SYSTEMS_MANAGER_PARAMETERS_PATH || undefined,
	// S3
	S3_CREATE_DEFAULT_BUCKETS: parseBoolean(process.env.S3_CREATE_DEFAULT_BUCKETS, false),
	S3_CREATE_BUCKETS: (process.env.S3_CREATE_BUCKETS ?? "").split(",") || [],
	S3_EXISTING_OBJECT_ARNS: (process.env.S3_ACCESSIBLE_OBJECT_ARNS ?? "").split(","),
	S3_ASSUME_ROLE_ARN: process.env.S3_ASSUME_ROLE_ARN || undefined,
	S3_MULTI_REGION: parseBoolean(process.env.S3_MULTI_REGION, false),
	S3_CLIENT_SIDE_DECRYPTION: parseBoolean(process.env.S3_CLIENT_SIDE_DECRYPTION, false),
	PATH_PREFIX: process.env.PATH_PREFIX || undefined,
	// CLOUDFRONT
	CREATE_CLOUD_FRONT_DISTRIBUTION: parseBoolean(process.env.CREATE_CLOUD_FRONT_DISTRIBUTION, true),
	CLOUDFRONT_ORIGIN_SHIELD_REGION: getOriginShieldRegion(
		process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1",
	),
	CLOUDFRONT_CORS_ENABLED: parseBoolean(process.env.CLOUDFRONT_CORS_ENABLED, true),
	// SAMPLE
	DEPLOY_SAMPLE_WEBSITE: parseBoolean(process.env.DEPLOY_SAMPLE_WEBSITE, false),
});

const parseNumber = (str: string | undefined, fallback: number): number => {
	if (!str) return fallback;

	const int = Number.parseInt(str, 10);

	return Number.isNaN(int) ? fallback : int;
};

const parseBoolean = (str: string | undefined, fallback: boolean): boolean => {
	if (!str) {
		return fallback;
	}

	if (str === "1" || str.toLocaleLowerCase() === "yes" || str.toLocaleLowerCase() === "true") {
		return true;
	}

	if (str === "0" || str.toLocaleLowerCase() === "no" || str.toLocaleLowerCase() === "false") {
		return false;
	}

	return fallback;
};
