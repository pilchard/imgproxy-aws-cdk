import { cyan, cyanBright, greenBright, red, white, yellowBright } from "ansis";
import { aws_ssm as ssm } from "aws-cdk-lib";
import { parse } from "dotenv";
import { $, ExecaError } from "execa";
import crypto from "node:crypto";
import fs from "node:fs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import prompts from "prompts";
import { getConfig, parseArray, parseNumber } from "../bin/config.ts";

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

import cdkJson from "../cdk.json";

const deployOutputsPath = resolve(process.cwd(), cdkJson.outputsFile);

const config = getConfig();
const imgproxyEnv = parse(readFileSync(resolve(process.cwd(), ".imgproxy.env")));

const { ENABLE_URL_SIGNING, SYSTEMS_MANAGER_PARAMETERS_PATH, CLOUDFRONT_CREATE_URL_REWRITE_FUNCTION } = config;
const secureParameters = ["IMGPROXY_KEY", "IMGPROXY_SALT"];

(async () => {
	if (!fs.existsSync(deployOutputsPath)) {
		console.error(red`Unable to find deploy outputs at: ${white`${deployOutputsPath}`}`);
		return;
	}

	// Read in deploy outputs
	const { "imgproxy-stack": imgproxyStackDeployOutputsJson } = JSON.parse(
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

	// init signing parameters and apply to KVS config
	let imgproxyKey = "";
	let imgproxySalt = "";

	const signatureParameters = await initSigningParams();
	if (signatureParameters.some !== undefined) {
		[imgproxyKey, imgproxySalt] = signatureParameters.some;
	}

	// Rectify and update Imgproxy SSM Parameters
	imgproxyEnv.IMGPROXY_KEY = imgproxyKey;
	imgproxyEnv.IMGPROXY_SALT = imgproxySalt;

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
})();

async function initSigningParams(): Promise<Option<[string, string], Error>> {
	let imgproxyKey = imgproxyEnv.IMGPROXY_KEY;
	if (imgproxyKey === undefined) {
		const { confirmGenerateKey } = await prompts({
			type: "confirm",
			name: "confirmGenerateKey",
			message: `URL signing is enabled but ${"IMGPROXY_KEY"} not found. Generate now?`,
		});

		if (!confirmGenerateKey) {
			return { none: new Error("Generate cancelled for IMGPROXY_KEY") };
		}

		imgproxyKey = (await $`xxd -g 2 -l 64 -c 64 -p /dev/random`).stdout;
	}

	let imgproxySalt = imgproxyEnv.IMGPROXY_SALT;
	if (imgproxySalt === undefined) {
		const { confirmGenerateSalt } = await prompts({
			type: "confirm",
			name: "confirmGenerateSalt",
			message: `URL signing is enabled but ${"IMGPROXY_KEY"} not found. Generate now?`,
		});

		if (!confirmGenerateSalt) {
			return { none: new Error("Generate cancelled for IMGPROXY_SALT") };
		}

		imgproxySalt = (await $`xxd -g 2 -l 64 -c 64 -p /dev/random`).stdout;
	}

	return { some: [imgproxyKey, imgproxySalt] };
}

async function rectifySsmParameters(): Promise<Option<ParameterStateObject, string>> {
	// TEMp
	const SYSTEMS_MANAGER_PARAMETERS_PATH = "imgproxy/dev";

	const parameterBasePath = `/${SYSTEMS_MANAGER_PARAMETERS_PATH}/`;

	const updateState: ParameterStateObject = {};

	const { stdout: existingParamsJson } = await $`aws ssm get-parameters-by-path \
    			--path ${parameterBasePath} \
				--output json`;

	if (existingParamsJson) {
		const { Parameters } = JSON.parse(existingParamsJson);
		for (const parameterPayload of Parameters) {
			const parameter = parameterPayload.Name.replace(parameterBasePath, "");
			updateState[parameterPayload.Name] = { param: parameter, curr: parameterPayload.Value };
		}
	}

	for (const [parameter, value] of Object.entries(imgproxyEnv)) {
		const parameterPath = `${parameterBasePath}${parameter}`;
		updateState[parameterPath] ??= { param: parameter };
		if (value.length) updateState[parameterPath].next = value;
	}

	const printState = (state: ParameterStateObject) => {
		const entries = Object.entries(state);
		if (entries.length) {
			for (const [path, { param, curr, next }] of entries) {
				const _curr = secureParameters.includes(param) ? `${curr?.slice(0, 2)}****${curr?.slice(-2)}` : curr;
				const _next = secureParameters.includes(param) ? `${next?.slice(0, 2)}****${next?.slice(-2)}` : next;
				if (curr) console.log((next ? yellowBright : red)`- ${path}: ${_curr}`);
				if (next) console.log(greenBright`+ ${path}: ${_next}`);
			}
		}
	};

	console.log(white`\nThe following SSM Parameter updates will be made:\n`);
	printState(updateState);
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
		} else {
			try {
				const parameterType = secureParameters.includes(param)
					? ssm.ParameterType.SECURE_STRING
					: ssm.ParameterType.STRING;
				await _putParameter(parameterPath, next, parameterType, ssm.ParameterTier.STANDARD, true);
			} catch (error) {
				console.error(`Failed to ${curr !== undefined ? "update" : "create"} parameter: ${parameterPath}`);
			}
		}
	}

	try {
		await $`aws ssm delete-parameters --names ${deleteParams.join(" ")}`;
	} catch (err) {
		console.error(`Failed to delete parameters with names: \n\t${deleteParams.join("\n\t")}`);
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
			console.log(s3ObjectListJson);

			const { Contents: defaultObjectPaths } = JSON.parse(s3ObjectListJson);

			console.log("Sample links");
			for (const { Key: objectUri } of defaultObjectPaths) {
				console.log();
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
						`${label}: https://${deployOutputs.ImgproxyDistributionDomainName}${signedImgproxyUri}`,
					);
				}
			}
		}
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
