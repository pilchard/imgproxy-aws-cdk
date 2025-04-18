import * as dotenv from "dotenv";
import { $ } from "execa";
import { readFileSync } from "node:fs";
import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getOriginShieldRegion } from "../lib/origin-shield.js";

import type { LogLevel } from "../functions/url-rewrite/index.js";
import type { UrlRewriteConfig } from "../functions/url-rewrite/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// signing setup
const imgproxySsmEnv = dotenv.parse(readFileSync(resolve(process.cwd(), ".imgproxy.env")));

const hexKey = async (len = 64) => {
	return (await $`xxd -g 2 -l ${len} -c ${len} -p /dev/urandom`).stdout;
};

let imgproxyKey = "";
let imgproxySalt = "";

if (process.env.ENABLE_URL_SIGNING) {
	imgproxyKey = imgproxySsmEnv.IMGPROXY_KEY || await hexKey();
	imgproxySalt = imgproxySsmEnv.IMGPROXY_SALT || await hexKey();

	imgproxySsmEnv.IMGPROXY_KEY = imgproxyKey;
	imgproxySsmEnv.IMGPROXY_SALT = imgproxySalt;
}

const urlRewriteConfig: UrlRewriteConfig = {
	imgproxy_key: imgproxyKey,
	imgproxy_salt: imgproxySalt,
	imgproxy_signature_size: parseNumber(imgproxySsmEnv.IMGPROXY_SIGNATURE_SIZE) ?? 32,
	imgproxy_trusted_signatures: parseArray(imgproxySsmEnv.IMGPROXY_TRUSTED_SIGNATURES),
	imgproxy_arguments_separator: imgproxySsmEnv.IMGPROXY_ARGUMENTS_SEPARATOR || ":",
	log_level: (<LogLevel> process.env.CLOUDFRONT_URL_REWRITE_FUNCTION_LOG_LEVEL) || "none",
};

// Stack Parameters
export const getConfig = (): ConfigProps => {
	// defaults
	const baseName = process.env.STACK_BASE_NAME || "imgproxy";
	const stackNameDefault = `${baseName}-stack`;
	const lambdaFunctionNameDefault = `${stackNameDefault}_${baseName}-lamdba`;
	const lambdaEcrRepositoryNameDefault = baseName;

	// computed
	const stackName = process.env.STACK_NAME || stackNameDefault;
	const ssmBasePath = process.env.SYSTEMS_MANAGER_PARAMETERS_BASE_PATH || stackName;
	const ssmEndpoint = process.env.SYSTEMS_MANAGER_PARAMETERS_ENDPOINT;
	const ssmParametersPath = ssmEndpoint ? `/${ssmBasePath}/${ssmEndpoint}` : `/${ssmBasePath}`;

	return {
		// CDK
		CDK_STACK_BASE_NAME: baseName,
		CDK_DEPLOY_ACCOUNT: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
		CDK_DEPLOY_REGION: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
		// STACK
		STACK_NAME: stackName,
		// IMGPROXY
		ENABLE_URL_SIGNING: parseBoolean(process.env.ENABLE_URL_SIGNING) ?? true,
		// LAMBDA
		LAMBDA_FUNCTION_NAME: process.env.LAMBDA_FUNCTION_NAME || lambdaFunctionNameDefault,
		LAMBDA_ECR_REPOSITORY_NAME: process.env.LAMBDA_ECR_REPOSITORY_NAME || lambdaEcrRepositoryNameDefault,
		LAMBDA_ECR_REPOSITORY_TAG: process.env.LAMBDA_ECR_REPOSITORY_TAG || "latest",
		LAMBDA_ARCHITECTURE: process.env.LAMBDA_ARCHITECTURE || "ARM64",
		LAMBDA_MEMORY_SIZE: parseNumber(process.env.LAMBDA_MEMORY_SIZE) ?? 2048,
		LAMBDA_TIMEOUT: parseNumber(process.env.LAMBDA_TIMEOUT) ?? 60,
		LAMBDA_SSM_PARAMETERS: imgproxySsmEnv,
		// SSM
		SYSTEMS_MANAGER_PARAMETERS_PATH: ssmParametersPath,
		// S3
		S3_CREATE_DEFAULT_BUCKETS: parseBoolean(process.env.S3_CREATE_DEFAULT_BUCKETS) ?? true,
		S3_CREATE_BUCKETS: parseArray(process.env.S3_CREATE_BUCKETS),
		S3_EXISTING_OBJECT_ARNS: parseArray(process.env.S3_EXISTING_OBJECT_ARNS),
		S3_ASSUME_ROLE_ARN: process.env.S3_ASSUME_ROLE_ARN || undefined,
		S3_MULTI_REGION: parseBoolean(process.env.S3_MULTI_REGION) ?? false,
		S3_CLIENT_SIDE_DECRYPTION: parseBoolean(process.env.S3_CLIENT_SIDE_DECRYPTION) ?? false,
		// CLOUDFRONT
		CLOUDFRONT_CREATE_DISTRIBUTION: parseBoolean(process.env.CLOUDFRONT_CREATE_DISTRIBUTION) ?? true,
		CLOUDFRONT_CORS_ENABLED: parseBoolean(process.env.CLOUDFRONT_CORS_ENABLED) ?? true,
		CLOUDFRONT_ORIGIN_SHIELD_ENABLED: parseBoolean(process.env.CLOUDFRONT_ORIGIN_SHIELD_ENABLED) ?? true,
		CLOUDFRONT_ORIGIN_SHIELD_REGION: getOriginShieldRegion(
			process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1",
		),
		CLOUDFRONT_ENABLE_STATIC_ORIGIN: parseBoolean(process.env.CLOUDFRONT_ENABLE_STATIC_ORIGIN) ?? true,
		// CLOUDFRONT FUNCTION
		CLOUDFRONT_CREATE_URL_REWRITE_FUNCTION: parseBoolean(process.env.CLOUDFRONT_CREATE_URL_REWRITE_FUNCTION)
			?? false,
		CLOUDFRONT_URL_REWRITE_FUNCTION_CONFIG: urlRewriteConfig,
		// SAMPLE
		DEPLOY_SAMPLE_WEBSITE: parseBoolean(process.env.DEPLOY_SAMPLE_WEBSITE) ?? false,
	};
};

export function parseNumber(str: string | undefined): number | undefined {
	if (str === undefined) return;

	const int = Number.parseInt(str, 10);

	return Number.isNaN(int) ? undefined : int;
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
	readonly CDK_STACK_BASE_NAME: string;
	readonly CDK_DEPLOY_ACCOUNT?: string | undefined;
	readonly CDK_DEPLOY_REGION?: string | undefined;

	// I M G P R O X Y
	//
	/**
	 * Enable URL signing for imgproxy urls: If true will set IMGPROXY_KEY and IMGPROXY_SALT in SSM (and KVS if CREATE_CLOUD_FRONT_URL_REWRITE_FUNCTION is true). Values will be pulled from .imgproxy.env if set otherwise default values will be generated using `/dev/urandom`
	 * @default true
	 */
	readonly ENABLE_URL_SIGNING: boolean;

	// A W S
	//
	// LAMBDA
	/**
	 * The name of the ECR repository which contains the image to use for the function. The image must be in an Amazon Elastic Container Registry (Amazon ECR) repository.
	 * @default  `${BASE_NAME}`
	 */
	readonly LAMBDA_ECR_REPOSITORY_NAME: string;
	/**
	 * The name of the ECR repository which contains the image to use for the function. The image must be in an Amazon Elastic Container Registry (Amazon ECR) repository.
	 * @default  `latest`
	 */
	readonly LAMBDA_ECR_REPOSITORY_TAG: string;
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
	/**
	 * The amount of time in seconds that Lambda allows a function to run before stopping it.
	 * @default 60
	 */
	readonly LAMBDA_SSM_PARAMETERS: dotenv.DotenvParseOutput;

	// SSM
	/**
	 * A path of AWS Systems Manager Parameter Store parameters that should be loaded as environment variables. The path should _NOT_ start with a slash (/) nor should it have a slash (/) at the end. For example, if you want to load the `IMGPROXY_KEY` variable from the `/imgproxy/prod/IMGPROXY_KEY` parameter, the value should be `imgproxy/prod`. If not set, imgproxy will load environment variables from the `/${StackName}/imgproxy` path.
	 * @default $STACK_NAME
	 */
	readonly SYSTEMS_MANAGER_PARAMETERS_PATH: string;

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
	readonly CLOUDFRONT_CREATE_DISTRIBUTION: boolean;
	/**
	 * Whether to enable CloudFront Origin Shield
	 * @default true
	 */
	readonly CLOUDFRONT_ORIGIN_SHIELD_ENABLED: boolean;
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
	/**
	 * If `true` a second CloudFront S3 origin will be created and paths starting with `"/static/*"` will be routed to it.
	 * @default true
	 */
	readonly CLOUDFRONT_ENABLE_STATIC_ORIGIN: boolean;

	// C L O U D F R O N T  F U N C T I O N
	/**
	 * Create a CloudFront function that rewrites the incoming URL to maximize cache hits?
	 * @default true
	 */
	readonly CLOUDFRONT_CREATE_URL_REWRITE_FUNCTION: boolean;
	/**
	 * Create a CloudFront function that rewrites the incoming URL to maximize cache hits?
	 * @default
	 */
	readonly CLOUDFRONT_URL_REWRITE_FUNCTION_CONFIG: UrlRewriteConfig;

	// S A M P L E
	/**
	 * Whether to deploy a second CloudFront distribution displaying sample images
	 * @default false
	 */
	readonly DEPLOY_SAMPLE_WEBSITE: boolean;
};
