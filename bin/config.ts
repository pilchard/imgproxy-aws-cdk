import * as dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getOriginShieldRegion } from "../lib/origin-shield.js";

import { blueBright, cyan, gray, greenBright, red, white, whiteBright, yellowBright } from "ansis";
import { RemovalPolicy } from "aws-cdk-lib";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

let config: ConfigProps | undefined;
export const getConfig = (profile?: string) => {
	if (config === undefined) {
		try {
			config = _initConfig(profile);
		} catch (error) {
			throw new Error("Configuration failed");
		}
	}

	return config;
};

// Initialize sta
const _initConfig = (profile?: string): ConfigProps => {
	console.log(blueBright`Initializing deploy configuration\n`);

	let deployAccount: string;
	let deployRegion: string;
	try {
		const resolvedDeployEnv = resolveDeployEnv(
			process.env.CDK_DEPLOY_ACCOUNT,
			process.env.CDK_DEPLOY_REGION,
			profile,
		);
		({ acct: deployAccount, region: deployRegion } = resolvedDeployEnv);

		console.log(white`  Account: ${deployAccount}`);
		console.log(white`  Region: ${deployRegion}`);
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error("Failed to resolve deploy environment", { cause: error });
	}

	// defaults
	const baseName = process.env.STACK_BASE_NAME || "imgproxy";
	const stackNameDefault = `${baseName}-stack`;
	const lambdaFunctionNameDefault = `${stackNameDefault}_${baseName}-lamdba`;

	// computed
	const stackName = process.env.STACK_NAME || stackNameDefault;

	// ecr
	const ecrRepositoryName = process.env.ECR_REPOSITORY_NAME || baseName;
	const ecrImageTag = getEcrImageTag(process.env.ECR_IMAGE_TAG) ?? "latest";
	// ssm
	const ssmBasePath = process.env.SYSTEMS_MANAGER_PARAMETERS_BASE_PATH || stackName;
	const ssmEndpoint = process.env.SYSTEMS_MANAGER_PARAMETERS_ENDPOINT;
	const ssmParametersPath = ssmEndpoint ? `/${ssmBasePath}/${ssmEndpoint}` : `/${ssmBasePath}`;

	return {
		// CDK
		CDK_STACK_BASE_NAME: baseName,
		CDK_DEPLOY_ACCOUNT: deployAccount,
		CDK_DEPLOY_REGION: deployRegion,
		// STACK
		STACK_NAME: stackName,
		// IMGPROXY
		ENABLE_URL_SIGNING: parseBoolean(process.env.ENABLE_URL_SIGNING) ?? true,
		// ECR
		ECR_CREATE_REPOSITORY: parseBoolean(process.env.ECR_REPOSITORY_NAME) ?? true,
		ECR_REPOSITORY_NAME: ecrRepositoryName,
		ECR_IMAGE_TAG: ecrImageTag,
		ECR_MAX_IMAGES: parseNumber(process.env.ECR_MAX_IMAGES) ?? 5,
		ECR_DOCKER_IMAGE_PATH: process.env.ECR_DOCKER_IMAGE_PATH || "ghcr.io/imgproxy/imgproxy:latest-arm64",
		// LAMBDA
		LAMBDA_FUNCTION_NAME: process.env.LAMBDA_FUNCTION_NAME || lambdaFunctionNameDefault,
		LAMBDA_ECR_REPOSITORY_NAME: ecrRepositoryName,
		LAMBDA_ECR_REPOSITORY_TAG: ecrImageTag,
		LAMBDA_ARCHITECTURE: process.env.LAMBDA_ARCHITECTURE || "ARM64",
		LAMBDA_MEMORY_SIZE: parseNumber(process.env.LAMBDA_MEMORY_SIZE) ?? 2048,
		LAMBDA_TIMEOUT: parseNumber(process.env.LAMBDA_TIMEOUT) ?? 60,
		// SSM
		SYSTEMS_MANAGER_PARAMETERS_PATH: ssmParametersPath,
		// S3
		S3_CREATE_DEFAULT_BUCKETS: parseBoolean(process.env.S3_CREATE_DEFAULT_BUCKETS) ?? true,
		S3_CREATE_BUCKETS: parseArray(process.env.S3_CREATE_BUCKETS),
		S3_EXISTING_OBJECT_ARNS: parseArray(process.env.S3_EXISTING_OBJECT_ARNS),
		S3_ASSUME_ROLE_ARN: process.env.S3_ASSUME_ROLE_ARN || undefined,
		S3_MULTI_REGION: parseBoolean(process.env.S3_MULTI_REGION) ?? false,
		S3_CLIENT_SIDE_DECRYPTION: parseBoolean(process.env.S3_CLIENT_SIDE_DECRYPTION) ?? false,
		S3_REMOVAL_POLICY: getRemovalPolicy(process.env.S3_REMOVAL_POLICY) ?? RemovalPolicy.RETAIN,
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
		// SAMPLE
		DEPLOY_SAMPLE_WEBSITE: parseBoolean(process.env.DEPLOY_SAMPLE_WEBSITE) ?? false,
	};
};

/**
 * ### Environment precedence with the AWS CDK
 *
 * There are multiple methods of specifying deploy environment values (Account ID, Region). The project adheres
 * to the following precedence:
 *
 * 1. Hard-coded values specified in the project `.env` file.
 * 2. Environment information associated with the profile from your `.aws/credentials` and `.aws/config` files
 * 		and passed to the deploy script using the `--profile` option.
 * 3. The default profile from your `.aws/credentials` and `.aws/config` files.
 * 4. AWS_DEFAULT_ACCOUNT and AWS_DEFAULT_REGION environment variables available in the shell.
 */
function resolveDeployEnv(
	acct: string | undefined,
	region: string | undefined,
	profile?: string,
): { acct: string; region: string; } | never {
	console.log(whiteBright`Resolving deploy env...`);

	/** 1. Hard-coded values specified in the project `.env` file. */
	if (acct?.trim().toLocaleLowerCase() && region?.trim().toLocaleLowerCase()) {
		_validateCallerPermissions(acct, region, profile);

		console.log(greenBright`Using values specified in ${"`./.env`"}`);
		return { acct, region };
	}

	const acctCmd = "aws configure get sso_account_id";
	const regionCmd = "aws configure get region";

	/** 2. Environment information associated with the profile from your `.aws/credentials` and `.aws/config` files and passed to the deploy script using the `--profile` option. */
	if (profile !== undefined) {
		try {
			const profileAcct = execSync(`${acctCmd} --profile ${profile}`).toString().trim();
			const profileRegion = execSync(`${regionCmd} --profile ${profile}`).toString().trim();

			if (profileAcct && profileRegion) {
				_validateCallerPermissions(profileAcct, profileRegion, profile);

				console.log(greenBright`Using config values for profile ${profile}`);
				return { acct: profileAcct, region: profileRegion };
			}
		} catch (error) {
			// console.error(The config profile (${profile}) could not be found`);
			throw new Error(`The config profile (${profile}) could not be found`, { cause: error });
		}
	}

	/** 3. The default profile from your `.aws/credentials` and `.aws/config` files. */
	try {
		const defaultCredAcct = execSync(acctCmd).toString().trim();
		const defaultCredRegion = execSync(regionCmd).toString().trim();

		if (defaultCredAcct && defaultCredRegion) {
			_validateCallerPermissions(defaultCredAcct, defaultCredRegion, profile);

			console.log(greenBright`Using default config values`);
			return { acct: defaultCredAcct, region: defaultCredRegion };
		}
	} catch (error) {
		console.error(yellowBright`A default config profile could not be found`);
	}

	console.log("Checking for AWS_DEFAULT values...");

	/** 4. AWS_DEFAULT_ACCOUNT and AWS_DEFAULT_REGION environment variables available in the shell. */
	const defaultEnvAcct = process.env.AWS_DEFAULT_ACCOUNT;
	const defaultEnvRegion = process.env.AWS_DEFAULT_REGION;

	if (defaultEnvAcct && defaultEnvRegion) {
		_validateCallerPermissions(defaultEnvAcct, defaultEnvRegion, profile);

		console.log(greenBright`Using AWS_DEFAULT_ACCOUNT and AWS_DEFAULT_REGION`);
		return { acct: defaultEnvAcct, region: defaultEnvRegion };
	}

	console.warn(yellowBright`AWS_DEFAULTS not found`);
	console.error(red`\nFailed to resolve deploy account or region`);

	console.info(white`\nThere are multiple methods of specifying environments (Account ID, Region).`);
	console.info(white`Ensure that you do one of the following before continuing:`);

	console.info(white`\n> Hard-code deploy env values in the project .env file.\n`);
	console.info(gray`  # ./.env\n`);
	console.info(cyan`  CDK_DEPLOY_ACCOUNT${white`=000111222333`}`);
	console.info(cyan`  CDK_DEPLOY_REGION${white`=us-east-1`}\n`);

	console.info(
		white`\n> Configure the AWS CLI with a named profile matching the one passed to deploy ('pnpm run deploy --profile <profile-name>)\n`,
	);
	console.info(white`  Interactive\n`);
	console.info(cyan`  ${gray`$`} aws configure`);

	console.info(white`\n  Manual [named]\n`);
	console.info(cyan`  ${gray`$`} aws configure set sso_account_id 000111222333 --profile profile-name`);
	console.info(cyan`  ${gray`$`} aws configure set region us-east-1 --profile profile-name`);

	console.info(white`\n> Configure the AWS CLI with a default profile\n`);

	console.info(white`  Manual [default]\n`);
	console.info(cyan`  ${gray`$`} aws configure set sso_account_id 000111222333`);
	console.info(cyan`  ${gray`$`} aws configure set region us-east-1`);

	console.info(white`\n  Specify a named profile as default by setting the AWS_PROFILE environment variable\n`);
	console.info(cyan`  ${gray`$`} export AWS_PROFILE="existing-profile-name"`);

	console.info(
		white`\n> Make the AWS_DEFAULT_ACCOUNT and AWS_DEFAULT_REGION environment variables available in the shell.\n`,
	);
	console.info(cyan`  ${gray`$`} export AWS_DEFAULT_REGION="111122223333"`);
	console.info(cyan`  ${gray`$`} export AWS_DEFAULT_ACCOUNT="us-east-1"\n`);

	console.info(white`See the documentation for more details.\n`);
	console.info(
		white`  CLI configuration: ${cyan`https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html\n`}`,
	);
	console.info(
		white`  CLI env variables: ${cyan`https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html\n`}`,
	);

	throw new Error("Failed to resolve deploy account or region");
}

function _validateCallerPermissions(acct: string, _region: string, profile?: string) {
	// confirm cli caller account identity
	// const { stdout: callerIdentityJson } = await $`aws sts get-caller-identity --output json`;
	try {
		const callerIdentityJson = execSync(
			`aws sts get-caller-identity${profile ? ` --profile ${profile}` : ""} --output json`,
			{ stdio: "pipe", encoding: "utf8" },
		);
		const { Account: callerAccount } = JSON.parse(callerIdentityJson);

		if (callerAccount !== acct) {
			throw red`CLI must be logged in with the account being deployed to. Expected ${white`${acct}`} but received ${white`${callerAccount}`}`;
		}
	} catch (e) {
		if (typeof e === "string") {
			console.error(red`${e}`);
			throw new Error(e);
		}
		if (e instanceof Error) {
			console.error(red`\n${e.message}\n`);
			console.error(white`  If you are logged in using SSO ensure one of the following:\n`);
			console.error(white`    - The AWS_PROFILE env variable is set with the relevant profile\n`);
			console.error(cyan`        ${gray`$`} export AWS_PROFIle="profile-name"\n`);
			console.error(white`    - The necessary credentials are available in ${"`~/.aws/credentials`"}\n`);
		}

		throw new Error("Validation failed");
	}
}

function getEcrImageTag(str: string | undefined): string | undefined {
	const _str = str?.trim().toLocaleLowerCase();

	if (_str === undefined || _str.length === 0) {
		return;
	}

	if (_str === "git") {
		return _getCurrentCommitHash();
	}

	return _str;
}

function _getCurrentCommitHash(): string {
	const gitRevParseResult = execSync("git rev-parse --short HEAD").toString().trim();

	if (gitRevParseResult.startsWith("fatal:")) {
		throw new Error(`Failed to retrieve current git commit hash with message: ${gitRevParseResult}`);
	}

	return gitRevParseResult;
}

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

export function getRemovalPolicy(str: string | undefined): RemovalPolicy | undefined {
	const _str = str?.trim().toLocaleLowerCase();

	if (_str === undefined || _str.length === 0) {
		return;
	}

	if (_str === "retain") {
		return RemovalPolicy.RETAIN;
	}

	if (_str === "destroy") {
		return RemovalPolicy.DESTROY;
	}

	if (_str === "update") {
		return RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE;
	}

	return;
}

export type ConfigProps = {
	// S T A C K
	//
	/**
	 * The name of the deployed AWS stack.
	 */
	readonly STACK_NAME: string;
	readonly CDK_STACK_BASE_NAME: string;
	readonly CDK_DEPLOY_ACCOUNT: string;
	readonly CDK_DEPLOY_REGION: string;

	// I M G P R O X Y
	//
	/**
	 * Enable URL signing for imgproxy urls: If true will set IMGPROXY_KEY and IMGPROXY_SALT in SSM (and KVS if CREATE_CLOUD_FRONT_URL_REWRITE_FUNCTION is true). Values will be pulled from .imgproxy.env if set otherwise default values will be generated using `/dev/urandom`
	 * @default true
	 */
	readonly ENABLE_URL_SIGNING: boolean;

	// ECR
	//
	/**
	 * The name of the ECR repository which contains the image to use for the function. The image must be in an Amazon Elastic Container Registry (Amazon ECR) repository.
	 * @default true
	 */
	readonly ECR_CREATE_REPOSITORY: boolean;
	/**
	 * The name of the ECR repository which contains the image to use for the Lambda function.
	 * @default `imgproxy`
	 */
	readonly ECR_REPOSITORY_NAME: string;
	/**
	 * The tag of the image within the ECR repository to use for the Lambda function. If the `git` is specified the short SHA1 hash of the current git commit will be used
	 * @default `latest`
	 */
	readonly ECR_IMAGE_TAG: string;
	/**
	 * The maximum number of images to keep in the repository. Images will be removed oldest first.
	 * @default 5
	 */
	readonly ECR_MAX_IMAGES: number;
	/**
	 * The path of the imgproxy Docker image to deploy to ECR
	 * @default `ghcr.io/imgproxy/imgproxy:latest-arm64`
	 */
	readonly ECR_DOCKER_IMAGE_PATH: string;

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
	 * @default `latest`
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
	/**
	 * The removal policy for buckets created by the stack as defined by the `RemovalPolicy` enum
	 * @default RemovalPolicy.RETAIN
	 */
	readonly S3_REMOVAL_POLICY: RemovalPolicy;

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

	// S A M P L E
	/**
	 * Whether to deploy a second CloudFront distribution displaying sample images
	 * @default false
	 */
	readonly DEPLOY_SAMPLE_WEBSITE: boolean;
};
