import { cyanBright, greenBright, red, white, yellowBright } from "ansis";
import { aws_ssm as ssm } from "aws-cdk-lib";
import { parse } from "dotenv";
import { $, ExecaError } from "execa";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import prompts from "prompts";
import { getConfig, parseArray, parseNumber } from "../bin/config.ts";

import type { UrlRewriteConfig } from "../functions/url-rewrite/index.ts";
import type { Option } from "../functions/utility";

type ParameterStateObject = { [path: string]: { param: string; curr?: string; next?: string; }; };

const config = getConfig();
const { ENABLE_URL_SIGNING, SYSTEMS_MANAGER_PARAMETERS_PATH, CREATE_URL_REWRITE_CLOUD_FRONT_FUNCTION } = config;

const imgproxyEnvironment = parse(readFileSync(resolve(process.cwd(), ".imgproxy.env")));

const signingParameters = ["IMGPROXY_KEY", "IMGPROXY_SALT", "IMGPROXY_SIGNATURE_SIZE", "IMGPROXY_TRUSTED_SIGNATURES"];
const secureParameters = ["IMGPROXY_KEY", "IMGPROXY_SALT"];

const urlRewriteConfig: UrlRewriteConfig = {
	imgproxy_salt: "",
	imgproxy_key: "",
	imgproxy_signature_size: 32,
	imgproxy_trusted_signatures: [],
	imgproxy_arguments_separator: ":",
	log_level: "error",
};

if (!ENABLE_URL_SIGNING) {
	const signingParameterPaths = signingParameters.map((parameter) =>
		`/${SYSTEMS_MANAGER_PARAMETERS_PATH}/${parameter}`
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
} else {
	// init signing parameters and apply to KVS config
	const signatureParameters = await initSigningParams();

	if (signatureParameters.some !== undefined) {
		const [imgproxyKey, imgproxySalt] = signatureParameters.some;

		imgproxyEnvironment.IMGPROXY_KEY = imgproxyKey;
		imgproxyEnvironment.IMGPROXY_SALT = imgproxySalt;

		if (CREATE_URL_REWRITE_CLOUD_FRONT_FUNCTION) {
			urlRewriteConfig.imgproxy_key = imgproxyKey;
			urlRewriteConfig.imgproxy_salt = imgproxySalt;
			urlRewriteConfig.imgproxy_signature_size = parseNumber(imgproxyEnvironment.IMGPROXY_SIGNATURE_SIZE)
				?? urlRewriteConfig.imgproxy_signature_size;
			urlRewriteConfig.imgproxy_trusted_signatures = urlRewriteConfig.imgproxy_trusted_signatures.concat(
				parseArray(imgproxyEnvironment.IMGPROXY_TRUSTED_SIGNATURES),
			);
			urlRewriteConfig.imgproxy_arguments_separator = imgproxyEnvironment.IMGPROXY_ARGUMENTS_SEPARATOR
				?? urlRewriteConfig.imgproxy_arguments_separator;

			// console.log(urlRewriteConfig);
		}
		// console.log(imgproxyEnvironment);
	}

	const rectifiedParameterState = await rectifyParameters();

	if (rectifiedParameterState.some !== undefined) {
		_updateParameters(rectifiedParameterState.some);

		if (CREATE_URL_REWRITE_CLOUD_FRONT_FUNCTION) {
			// describe

			// put
			const { stdout } = await $`aws ssm put-key \
				--key config \
				--value urlRewriteConfig \
				--kvs-arn <value> \
				--if-match <value>`;

			console.log(stdout);
		}
	}
}

async function initSigningParams(): Promise<Option<[string, string], Error>> {
	let imgproxyKey = imgproxyEnvironment.IMGPROXY_KEY;
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

	let imgproxySalt = imgproxyEnvironment.IMGPROXY_SALT;
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

async function rectifyParameters(): Promise<Option<ParameterStateObject, string>> {
	// TEMp
	const SYSTEMS_MANAGER_PARAMETERS_PATH = "imgproxy/dev";

	const parameterBasePath = `/${SYSTEMS_MANAGER_PARAMETERS_PATH}/`;

	const updateState: ParameterStateObject = {};

	const { stdout } = await $`aws ssm get-parameters-by-path \
    --path ${parameterBasePath} \
	--output json`;

	if (stdout) {
		const { Parameters } = JSON.parse(stdout);
		for (const parameterPayload of Parameters) {
			const parameter = parameterPayload.Name.replace(parameterBasePath, "");
			updateState[parameterPayload.Name] = { param: parameter, curr: parameterPayload.Value };
		}
	}

	for (const [parameter, value] of Object.entries(imgproxyEnvironment)) {
		const parameterPath = `${parameterBasePath}${parameter}`;
		updateState[parameterPath] ??= { param: parameter };
		if (value.length) updateState[parameterPath].next = value;
	}

	const printState = (state: ParameterStateObject) => {
		const entries = Object.entries(state);
		if (entries.length) {
			console.log("\n");
			for (const [path, { param, curr, next }] of entries) {
				const _curr = secureParameters.includes(param) ? `${curr?.slice(0, 2)}****${curr?.slice(-2)}` : curr;
				const _next = secureParameters.includes(param) ? `${next?.slice(0, 2)}****${next?.slice(-2)}` : next;
				if (curr) console.log((next ? yellowBright : red)`- ${path}: ${_curr}`);
				if (next) console.log(greenBright`+ ${path}: ${_next}`);
			}
			console.log("\n");
		}
	};

	console.log(white`The following SSM Parameter updates will be made:\n`);
	printState(updateState);

	const { confirmUpdateParams } = await prompts({
		type: "confirm",
		name: "confirmUpdateParams",
		message: "Continue with the above updates?",
		onRender() {
			if (!Array.isArray(this)) {
				this.message = cyanBright`Continue with updates?`;
			}
		},
	});

	if (!confirmUpdateParams) {
		console.log(red`Updates aborted by user`);
		return { none: "Updates cancelled" };
	}

	// 	console.log("Proceed to update...");
	return { some: updateState };
}

async function _updateParameters(state: ParameterStateObject) {
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

async function _putParameter(
	key: string,
	value: string,
	type: ssm.ParameterType,
	tier: ssm.ParameterTier = ssm.ParameterTier.STANDARD,
	overwrite = false,
) {
	try {
		const { stdout } = await $`aws ssm put-parameter \
	            --name /imgproxy/testing/${key} \
	            --value ${`"${value}"`} \
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
// const VALUE = imgproxyEnvironment[KEY];

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

// for (const [k, v] of Object.entries(imgproxyEnvironment)) {
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
