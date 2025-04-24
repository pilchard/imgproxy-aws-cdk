import { bgBlueBright, blueBright, cyan, cyanBright, greenBright, red, white, whiteBright, yellowBright } from "ansis";
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
import type { ConfigProps } from "./config.ts";

type ImgproxyEnv = Record<string, string>;
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

export async function postDeploy() {
	console.log(bgBlueBright`\nImgproxy post-deploy\n`);

	let config: ConfigProps;

	try {
		config = getConfig();
	} catch (error) {
		if (error instanceof Error) {
			console.error(red`${error.message}`);
		}
		return;
	}

	const { STACK_NAME, ENABLE_URL_SIGNING, SYSTEMS_MANAGER_PARAMETERS_PATH, CLOUDFRONT_CREATE_URL_REWRITE_FUNCTION } =
		config;

	const SECURE_PARAMETERS = ["IMGPROXY_KEY", "IMGPROXY_SALT"];

	const deployOutputsPath = resolve(process.cwd(), cdkJson.outputsFile);
	if (!fs.existsSync(deployOutputsPath)) {
		console.error(red`\nUnable to find deploy outputs at: ${white`${deployOutputsPath}`}`);
		return;
	}

	let imgproxyEnv: ImgproxyEnv = {};

	const imgproxyEnvPath = resolve(process.cwd(), ".imgproxy.env");
	if (fs.existsSync(imgproxyEnvPath)) {
		imgproxyEnv = parse(readFileSync(imgproxyEnvPath));
	}

	// Read in deploy outputs
	const { [STACK_NAME]: imgproxyStackDeployOutputsJson } = JSON.parse(
		readFileSync(deployOutputsPath, { encoding: "utf-8" }),
	);
	const imgproxyStackDeployOutputs: ImgproxyStackDeployOutputs = imgproxyStackDeployOutputsJson;

	/**
	 * Enable URL Signing
	 */

	// init signing parameters
	let imgproxyKey = "";
	let imgproxySalt = "";
	if (ENABLE_URL_SIGNING) {
		[imgproxyKey, imgproxySalt] = await initSigningParams(imgproxyEnv, SYSTEMS_MANAGER_PARAMETERS_PATH);
	}

	// Update imgproxy environment
	imgproxyEnv.IMGPROXY_KEY = imgproxyKey;
	imgproxyEnv.IMGPROXY_SALT = imgproxySalt;

	// Rectify and update Imgproxy SSM Parameters
	const rectifiedParameterState = await rectifySsmParameters(
		imgproxyEnv,
		SYSTEMS_MANAGER_PARAMETERS_PATH,
		SECURE_PARAMETERS,
	);
	if (rectifiedParameterState.some !== undefined) {
		await updateSsmParameters(rectifiedParameterState.some, SECURE_PARAMETERS);
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

async function initSigningParams(imgproxyEnv: ImgproxyEnv, ssmParametersPath: string): Promise<[string, string]> {
	let imgproxyKey = "";
	let imgproxySalt = "";

	try {
		imgproxyKey = await _rectifySigningValue("IMGPROXY_KEY", imgproxyEnv, ssmParametersPath);
	} catch (error) {
		console.error(red`Generate cancelled for IMGPROXY_KEY`);
	}

	try {
		imgproxySalt = await _rectifySigningValue("IMGPROXY_SALT", imgproxyEnv, ssmParametersPath);
	} catch (error) {
		console.error(red`Generate cancelled for IMGPROXY_SALT`);
	}

	return [imgproxyKey, imgproxySalt];
}

async function _rectifySigningValue(
	parameterName: string,
	imgproxyEnv: ImgproxyEnv,
	ssmParametersPath: string,
): Promise<string> {
	let signingValue = imgproxyEnv[parameterName];

	let retrievedSigningValue: string | undefined;
	try {
		const { stdout: retrievedParamJson } = await $`aws ssm get-parameter \
    			--name ${`${ssmParametersPath}/${parameterName}`} \
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

async function rectifySsmParameters(
	imgproxyEnv: ImgproxyEnv,
	ssmParametersPath: string,
	secureParameters: string[],
): Promise<Option<ParameterStateObject, string>> {
	const updateState: ParameterStateObject = {};

	const { stdout: existingParamsJson } = await $`aws ssm get-parameters-by-path \
    			--path ${ssmParametersPath} \
				--with-decryption \
				--output json`;

	if (existingParamsJson) {
		const { Parameters } = JSON.parse(existingParamsJson);
		for (const parameterPayload of Parameters) {
			const parameter = parameterPayload.Name.replace(`${ssmParametersPath}/`, "");
			updateState[parameterPayload.Name] = { param: parameter, curr: parameterPayload.Value };
		}
	}

	for (const [parameter, value] of Object.entries(imgproxyEnv)) {
		const parameterPath = `${ssmParametersPath}/${parameter}`;
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

async function updateSsmParameters(state: ParameterStateObject, secureParameters: string[]) {
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
				console.log(whiteBright.underline`\n${objectUri}\n`);

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

const _sign = (salt: string, target: string, secret: string, size: number) => {
	const hmac = crypto.createHmac("sha256", _hexDecode(secret));
	hmac.update(_hexDecode(salt));
	hmac.update(target);

	return Buffer.from(hmac.digest().slice(0, size)).toString("base64url");
};

const _hexDecode = (hex: string) => Buffer.from(hex, "hex");

postDeploy();
