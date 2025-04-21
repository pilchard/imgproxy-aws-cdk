import { bgBlueBright, blueBright, cyan, cyanBright, greenBright, red, white, yellowBright } from "ansis";
import { aws_ssm as ssm } from "aws-cdk-lib";
import { parse } from "dotenv";
import { $, ExecaError } from "execa";
import crypto from "node:crypto";
import fs from "node:fs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import prompts from "prompts";
import cdkJson from "../cdk.json";
import { getConfig, parseArray, parseNumber } from "./config.ts";

import type { LogLevel, UrlRewriteConfig } from "../functions/url-rewrite/index.ts";
import type { Option } from "../functions/utility";

type ParameterStateObject = { [path: string]: { param: string; curr?: string; next?: string; }; };
type ImgproxyStackDeployOutputs = {
	UrlRewriteStoreArn?: string;
	ImgproxyDistributionDomainName?: string;
	DefaultImgproxyBucketName?: string;
	CreatedS3Buckets?: string;
	SampleWebsiteDomainName?: string;
	SampleWebsiteS3BucketName?: string;
};
type SigningConfig = Omit<UrlRewriteConfig, "log_level">;

const config = getConfig();
const imgproxyEnv = parse(readFileSync(resolve(process.cwd(), ".imgproxy.env")));
const deployOutputsPath = resolve(process.cwd(), cdkJson.outputsFile);

const {
	CDK_DEPLOY_ACCOUNT,
	CDK_DEPLOY_REGION,
	STACK_NAME,
	ECR_REPOSITORY_NAME,
	ECR_IMAGE_TAG,
	ENABLE_URL_SIGNING,
	SYSTEMS_MANAGER_PARAMETERS_PATH,
	CLOUDFRONT_CREATE_URL_REWRITE_FUNCTION,
} = config;
const secureParameters = ["IMGPROXY_KEY", "IMGPROXY_SALT"];

switch (process.argv[2]) {
	case "deploy": {
		deploy();
		break;
	}
	case "destroy": {
		destroy();
		break;
	}
}

async function destroy() {
	console.log(blueBright`\nImgproxy post-destroy...`);

	const { stdout: callerIdentityJson } = await $`aws sts get-caller-identity --output json`;
	const { Account: callerAccount } = JSON.parse(callerIdentityJson);

	// confirm deploy account and region
	if (CDK_DEPLOY_ACCOUNT === undefined || CDK_DEPLOY_REGION === undefined) {
		throw new Error("Unable to determine CDK_DEPLOY_ACCOUNT or CDK_DEPLOY_REGION");
	}

	// confirm cli caller account identity
	if (callerAccount !== config.CDK_DEPLOY_ACCOUNT) {
		console.error(
			red`CLI must be invoked with the account being deployed to. Expected ${white`${config.CDK_DEPLOY_ACCOUNT}`} but received ${white`${callerAccount}`}`,
		);
		return;
	}

	try {
		const { stdout: existingParamsJson } =
			await $`aws ssm get-parameters-by-path --path ${SYSTEMS_MANAGER_PARAMETERS_PATH} --recursive --query Parameters[].Name --output json `;
		const existingParams: string[] = JSON.parse(existingParamsJson);

		if (existingParams.length) {
			console.log(white`\nThe following SSM Parameters will be deleted:\n`);
			for (const param of existingParams) {
				console.log(red`- ${param}`);
			}
			console.log("\n");

			const { confirmDeleteParams } = await prompts({
				type: "confirm",
				name: "confirmDeleteParams",
				message: "Continue with SSM Parameter deletion?",
				onRender() {
					if (!Array.isArray(this)) {
						this.message = cyanBright`Continue with SSM Parameter deletion?`;
					}
				},
			});

			if (confirmDeleteParams) {
				console.log("\nDeleting SSM Parameters...");
				for (const param of existingParams) {
					console.log(red`\n- ${param}`);
					const { stdout: deletedParam } = await $`aws ssm delete-parameter --name ${param}`;
					console.log(deletedParam);
				}
				console.log(greenBright`SSM Parameter deletion complete\n`);
			} else {
				console.log(red`SSM Parameter deletion aborted\n`);
			}

			console.log(
				white`\nPreparing to delete the ECR repository with name ${ECR_REPOSITORY_NAME}. Deleting the repository will also delete all of its contents.\n`,
			);
			const { confirmDeleteEcr } = await prompts({
				type: "confirm",
				name: "confirmDeleteEcr",
				message: "Continue with ECR repository deletion?",
				onRender() {
					if (!Array.isArray(this)) {
						this.message = cyanBright`Continue with ECR repository deletion?`;
					}
				},
			});

			if (confirmDeleteEcr) {
				console.log("\nDeleting ECR Repository...");
				const awsEcrImagePath =
					`${CDK_DEPLOY_ACCOUNT}.dkr.ecr.${CDK_DEPLOY_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${ECR_IMAGE_TAG}`;

				const { stdout: imgproxyEcrDeleteJson } = await $`aws ecr delete-repository \
					--repository-name ${awsEcrImagePath} \
					--force \
					--output json`;

				console.log(greenBright`ECR Repository deletion complete\n`);
			} else {
				console.log(red`ECR Repository deletion aborted\n`);
			}

			console.log(blueBright`\nImgproxy post-destroy complete`);
		}
	} catch (error) {
		if (error instanceof ExecaError) {
			console.error(error.message);
			if (error.cause) {
				console.error(error.cause);
			}
		}
	}
}

async function deploy() {
	const { stdout: callerIdentityJson } = await $`aws sts get-caller-identity --output json`;
	const { Account: callerAccount } = JSON.parse(callerIdentityJson);

	if (callerAccount !== config.CDK_DEPLOY_ACCOUNT) {
		console.error(
			red`CLI must be logged in with the account being deployed to. Expected Account ID: \`config.CDK_DEPLOY_ACCOUNT\` but received \`callerAccount\` `,
		);
		return;
	}

	if (!fs.existsSync(deployOutputsPath)) {
		console.error(red`Unable to find deploy outputs at: ${white`${deployOutputsPath}`}`);
		return;
	}

	// Read in deploy outputs
	const { [STACK_NAME]: imgproxyStackDeployOutputsJson } = JSON.parse(
		readFileSync(deployOutputsPath, { encoding: "utf-8" }),
	);
	const imgproxyStackDeployOutputs: ImgproxyStackDeployOutputs = imgproxyStackDeployOutputsJson;
	/**
	 * Disable URL Signing
	 *
	 * If signing not enabled remove KEY and SALT to signal to imgproxy to ignore signing
	 */
	if (!ENABLE_URL_SIGNING) {
		const signingParameters = [
			"IMGPROXY_KEY",
			"IMGPROXY_SALT",
			// "IMGPROXY_SIGNATURE_SIZE",
			// "IMGPROXY_TRUSTED_SIGNATURES",
		];

		const signingParameterPaths = signingParameters.map((parameter) =>
			`${SYSTEMS_MANAGER_PARAMETERS_PATH}/${parameter}`
		).join(" ");

		try {
			await $`aws ssm delete-parameters --names ${signingParameterPaths}`;
		} catch (error) {
			if (error instanceof ExecaError) {
				console.error(error.message);
				if (error.cause) {
					console.error(error.cause);
				}
			}
		}

		const signingConfig: SigningConfig = {
			imgproxy_key: "",
			imgproxy_salt: "",
			imgproxy_signature_size: parseNumber(imgproxyEnv.IMGPROXY_SIGNATURE_SIZE) ?? 32,
			imgproxy_trusted_signatures: parseArray(imgproxyEnv.IMGPROXY_TRUSTED_SIGNATURES),
			imgproxy_arguments_separator: imgproxyEnv.IMGPROXY_ARGUMENTS_SEPARATOR || ":",
		};

		logOutput(imgproxyStackDeployOutputs, signingConfig);
		return;
	}

	/**
	 * Enable URL Signing
	 */

	// init signing parameters
	const [imgproxyKey, imgproxySalt] = await initSigningParams();

	// Update imgproxy environment
	imgproxyEnv.IMGPROXY_KEY = imgproxyKey;
	imgproxyEnv.IMGPROXY_SALT = imgproxySalt;

	// Rectify and update Imgproxy SSM Parameters
	const rectifiedParameterState = await rectifySsmParameters();
	if (rectifiedParameterState.some !== undefined) {
		await updateSsmParameters(rectifiedParameterState.some);
	}

	const urlRewriteConfig: UrlRewriteConfig = {
		imgproxy_key: imgproxyKey,
		imgproxy_salt: imgproxySalt,
		imgproxy_signature_size: parseNumber(imgproxyEnv.IMGPROXY_SIGNATURE_SIZE) ?? 32,
		imgproxy_trusted_signatures: parseArray(imgproxyEnv.IMGPROXY_TRUSTED_SIGNATURES),
		imgproxy_arguments_separator: imgproxyEnv.IMGPROXY_ARGUMENTS_SEPARATOR || ":",
		log_level: (<LogLevel> process.env.CLOUDFRONT_URL_REWRITE_FUNCTION_LOG_LEVEL) || "none",
	};

	// Update Key Value Store associeated with the UrlRewrite CloudFront Function
	if (CLOUDFRONT_CREATE_URL_REWRITE_FUNCTION && imgproxyStackDeployOutputs.UrlRewriteStoreArn !== undefined) {
		await updateKeyValueStore(imgproxyStackDeployOutputs.UrlRewriteStoreArn, [{
			Key: "config",
			Value: JSON.stringify(urlRewriteConfig),
		}]);
	}

	logOutput(imgproxyStackDeployOutputs, urlRewriteConfig);
	// UrlRewriteStoreArn;
	// sampleBucketDeploymentKey;
	// ImgproxyDistributionUrl;
}

async function initSigningParams(): Promise<[string, string]> {
	let imgproxyKey = "";
	let imgproxySalt = "";

	try {
		imgproxyKey = await _generateSigningValue("IMGPROXY_KEY");
	} catch (error) {
		console.error(red`Generate cancelled for IMGPROXY_KEY`);
	}

	try {
		imgproxySalt = await _generateSigningValue("IMGPROXY_SALT");
	} catch (error) {
		console.error(red`Generate cancelled for IMGPROXY_SALT`);
	}

	return [imgproxyKey, imgproxySalt];
}

async function _generateSigningValue(parameterName: string): Promise<string> {
	let signingValue = imgproxyEnv[parameterName];

	let retrievedSigningValue: string | undefined;
	try {
		const { stdout: retrievedParamJson } = await $`aws ssm get-parameter \
    			--name ${`${SYSTEMS_MANAGER_PARAMETERS_PATH}/${parameterName}`} \
				--with-decryption \
				--query Parameter \
				--output json`;
		const { Value: retrievedParamValue } = JSON.parse(retrievedParamJson);

		retrievedSigningValue = retrievedParamValue;
	} catch (error) {
		// console.info("No existing IMGPROXY_SALT SSM Parameter found");
	}

	if (retrievedSigningValue !== undefined && retrievedSigningValue !== signingValue) {
		console.log(
			cyanBright`\nAn existing ${parameterName} parameter was retrieved from AWS that differs from that specified by the environment.`,
		);
		const { confirmKeepRetrieved } = await prompts({
			type: "confirm",
			name: "confirmKeepRetrieved",
			message: "Keep existing AWS value?",
		});

		if (confirmKeepRetrieved) {
			return retrievedSigningValue;
		}
	}

	if (signingValue === undefined) {
		console.log(
			cyanBright`\nURL signing is enabled but no ${parameterName} value is specified by the environment.`,
		);

		const { confirmGenerate } = await prompts({
			type: "confirm",
			name: "confirmGenerate",
			message: `Generate a new ${parameterName} value?`,
		});

		if (!confirmGenerate) {
			throw new Error(`Generate cancelled for ${parameterName}`);
		}

		signingValue = (await $`xxd -g 2 -l 64 -c 64 -p /dev/random`).stdout;
	}

	return signingValue;
}

async function rectifySsmParameters(): Promise<Option<ParameterStateObject, string>> {
	const updateState: ParameterStateObject = {};

	const { stdout: existingParamsJson } = await $`aws ssm get-parameters-by-path \
    			--path ${SYSTEMS_MANAGER_PARAMETERS_PATH} \
				--with-decryption \
				--output json`;

	if (existingParamsJson) {
		const { Parameters } = JSON.parse(existingParamsJson);
		for (const parameterPayload of Parameters) {
			const parameter = parameterPayload.Name.replace(`${SYSTEMS_MANAGER_PARAMETERS_PATH}/`, "");
			updateState[parameterPayload.Name] = { param: parameter, curr: parameterPayload.Value };
		}
	}

	for (const [parameter, value] of Object.entries(imgproxyEnv)) {
		const parameterPath = `${SYSTEMS_MANAGER_PARAMETERS_PATH}/${parameter}`;
		updateState[parameterPath] ??= { param: parameter };
		if (value.length) updateState[parameterPath].next = value;
	}

	console.log(white`\nThe following SSM Parameter updates will be made:\n`);
	const updateEntries = Object.entries(updateState);
	if (updateEntries.length) {
		for (const [path, { param, curr, next }] of updateEntries) {
			const _curr = secureParameters.includes(param) ? `${curr?.slice(0, 2)}****${curr?.slice(-2)}` : curr;
			const _next = secureParameters.includes(param) ? `${next?.slice(0, 2)}****${next?.slice(-2)}` : next;
			if (curr && next && curr === next) {
				console.log(blueBright`= ${path}: ${_next}`);
			} else {
				if (curr) console.log((next ? yellowBright : red)`- ${path}: ${_curr}`);
				if (next) console.log(greenBright`+ ${path}: ${_next}`);
			}
		}
	}
	console.log("\n");

	const { confirmUpdateParams } = await prompts({
		type: "confirm",
		name: "confirmUpdateParams",
		message: "Continue with SSM Parameter updates?",
		onRender() {
			if (!Array.isArray(this)) {
				this.message = cyanBright`Continue with SSM Parameter updates?`;
			}
		},
	});

	if (!confirmUpdateParams) {
		console.log(red`SSM Parameter updates aborted\n`);
		return { none: "Updates cancelled" };
	}

	// 	console.log("Proceed to update...");
	return { some: updateState };
}

async function updateSsmParameters(state: ParameterStateObject) {
	const deleteParams: string[] = [];
	for (const [parameterPath, { param, curr, next }] of Object.entries(state)) {
		if (next === undefined) {
			deleteParams.push(parameterPath);
		} else if (curr !== next) {
			try {
				const parameterType = secureParameters.includes(param)
					? ssm.ParameterType.SECURE_STRING
					: ssm.ParameterType.STRING;
				console.log(greenBright`\n${parameterPath}`);
				await _putParameter(parameterPath, next, parameterType, ssm.ParameterTier.STANDARD, true);
			} catch (error) {
				console.error(`Failed to ${curr !== undefined ? "update" : "create"} parameter: ${parameterPath}`);
			}
		}
	}

	try {
		for (const param of deleteParams) {
			console.log(red`\n- ${param}`);
			const { stdout: deletedParam } = await $`aws ssm delete-parameter --name ${param}`;
			console.log(deletedParam);
		}
		// await $`aws ssm delete-parameters --names ${deleteParams.join(" ")}`;
	} catch (err) {
		console.error(`Failed to delete parameters: \n\t${deleteParams.join("\n\t")}`);
	}
}

async function updateKeyValueStore(
	kvsArn: string,
	puts: { Key: string; Value: string; }[],
	deletes: { Key: string; }[] = [],
) {
	console.log(white`\nThe following KVS updates will be made:\n`);
	for (const { Key } of deletes) {
		console.log(red`- ${Key}`);
	}
	for (const { Key, Value } of puts) {
		console.log(greenBright`+ ${Key}: ${Value}`);
	}
	console.log("\n");
	const { confirmUpdateKvs } = await prompts({
		type: "confirm",
		name: "confirmUpdateKvs",
		message: "Continue with Key Value Store updates?",
		onRender() {
			if (!Array.isArray(this)) {
				this.message = cyan`Continue with Key Value Store updates?`;
			}
		},
	});

	if (!confirmUpdateKvs) {
		console.log(red`Key Value Store updates aborted\n`);
		return;
	}

	try {
		const { stdout: kvsDescriptionJson } = await $`aws cloudfront-keyvaluestore describe-key-value-store \
					--kvs-arn ${kvsArn} \
					--output json`;

		const { ETag } = JSON.parse(kvsDescriptionJson);

		const { stdout: _resultJson } = await $`aws cloudfront-keyvaluestore update-keys \
					--kvs-arn ${kvsArn} \
					--if-match ${ETag} \
					--puts ${JSON.stringify(puts)} \
					--deletes ${JSON.stringify(deletes)} \
					--output json`;
	} catch (error) {
		if (error instanceof ExecaError) {
			console.error(error.message);
			if (error.cause) {
				console.error(error.cause);
			}
		}
	}
}

async function _putParameter(
	key: string,
	value: string,
	type: ssm.ParameterType,
	tier: ssm.ParameterTier = ssm.ParameterTier.STANDARD,
	overwrite = false,
) {
	try {
		const { stdout } = await $`aws ssm put-parameter \
	            --name ${key} \
	            --value ${value} \
	            --type ${type} \
	            --tier ${tier} \
				${overwrite ? "--overwrite" : ""}`;

		console.log(stdout);
	} catch (error) {
		if (error instanceof ExecaError) {
			console.error(error.message);
			console.error(error.cause);
		}
	}
}

/**
 * Stack output logging
 */

async function logOutput(deployOutputs: ImgproxyStackDeployOutputs, signingOptions: SigningConfig) {
	const shouldSign = signingOptions.imgproxy_key.length && signingOptions.imgproxy_salt.length;

	const processingOptions = {
		wide: ["resizing_type:fit", "width:600", "height:400"],
		tall: ["resizing_type:fit", "width:400", "height:600"],
	};

	try {
		if (deployOutputs.DefaultImgproxyBucketName !== undefined) {
			const { stdout: s3ObjectListJson } = await $`aws s3api list-objects-v2 \
					--bucket ${deployOutputs.DefaultImgproxyBucketName} \
					--output json`;

			const { Contents: defaultObjectPaths } = JSON.parse(s3ObjectListJson);

			console.log("Sample links");
			for (const { Key: objectUri } of defaultObjectPaths) {
				console.log(bgBlueBright`\n${objectUri}\n`);

				// s3://imgproxy-stack-imgproxystackimgproxybucket21397567-5riy5cmwkypo/imgproxy/default/Imgproxy Stack_1080x1920.png
				const s3Uri = `s3://${deployOutputs.DefaultImgproxyBucketName}/${objectUri}`;

				const encodedS3Uri = Buffer.from(s3Uri).toString("base64url");

				for (const [label, options] of Object.entries(processingOptions)) {
					const imgproxyUri = `/${options.join("/")}/${encodedS3Uri}`;
					let signature = "unsigned";
					if (shouldSign) {
						signature = _sign(
							signingOptions.imgproxy_salt,
							imgproxyUri,
							signingOptions.imgproxy_key,
							signingOptions.imgproxy_signature_size,
						);
					}

					const signedImgproxyUri = `/${signature}${imgproxyUri}`;
					console.log(
						`${label}: ${blueBright`https://${deployOutputs.ImgproxyDistributionDomainName}${signedImgproxyUri}`}`,
					);
				}
			}
		}

		console.log("\nDeploy outputs\n");
		console.log(deployOutputs);
	} catch (error) {
		if (error instanceof ExecaError) {
			console.error(error.message);
			console.error(error.cause);
		}
	}
}

const _hexDecode = (hex: string) => Buffer.from(hex, "hex");

const _sign = (salt: string, target: string, secret: string, size: number) => {
	const hmac = crypto.createHmac("sha256", _hexDecode(secret));
	hmac.update(_hexDecode(salt));
	hmac.update(target);

	return Buffer.from(hmac.digest().slice(0, size)).toString("base64url");
};

// try {
// 	const { stdout } = await $`aws sts get-caller-identity`;
// 	console.log(stdout, "\n");
// } catch (error) {
// 	if (error instanceof ExecaError) {
// 		console.error(error.message); // true
// 		if (error.cause) {
// 			console.error(error.cause);
// 		}
// 	}

// 	const response = await prompts({ type: "confirm", name: "confirmed", message: "Can you confirm?" });
// }

// const KEY = "IMGPROXY_HEALTH_CHECK_MESSAGE";
// const VALUE = imgproxyEnv[KEY];

// const nameRegexp = /^\s*Name:\s+([a-zA-Z0-9_.-\/]+)/;
// const errors: Error[] = [];

// for await (const line of $`aws ssm describe-parameters --no-paginate`) {
// 	const [, match] = nameRegexp.exec(line) ?? [];

// 	if (match?.includes(KEY)) {
// 		console.log(line);
// 		console.log(match);
// 		try {
// 			await $`aws ssm delete-parameter --name ${match}`;
// 		} catch (err) {
// 			errors.push(new Error(`failed to delete parameter with name; ${match}`, { cause: err }));
// 		}
// 	}
// 	// console.log("***");
// 	// console.log(line);
// }

// if (KEY && VALUE) {

// for (const [k, v] of Object.entries(imgproxyEnv)) {
// 	console.log(`${k} -> ${v}`);
// 	const { stdout } = await $`aws ssm put-parameter \
//             --name /imgproxy/testing/${KEY} \
//             --value ${`"${VALUE}"`} \
//             --type String \
//             --tier Standard \
// 			   --overwrite`;

// 	console.log(stdout);
// }
// }
