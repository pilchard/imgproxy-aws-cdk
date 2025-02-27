import { aws_ssm as ssm } from "aws-cdk-lib";
import { $, ExecaError, execa } from "execa";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
import prompts from "prompts";

import { stdout } from "node:process";
import { getConfig } from "../lib/config.ts";

const config = getConfig();
const { ENABLE_PRO_OPTIONS, ENABLE_URL_SIGNING, SYSTEMS_MANAGER_PARAMETERS_BASE_PATH } = config;

const imgproxyEnvironment = parse(readFileSync(resolve(process.cwd(), ".imgproxy.env")));

const signingKeys = [
	"IMGPROXY_KEY",
	"IMGPROXY_SALT",
	"IMGPROXY_SIGNATURE_SIZE",
	"IMGPROXY_TRUSTED_SIGNATURES",
];

// let ssmParameters = [];
// let kvsParameters = [];

async function configureSignature() {
	if (!ENABLE_URL_SIGNING) {
		const signingParameters = signingKeys
			.map((key) => `${SYSTEMS_MANAGER_PARAMETERS_BASE_PATH}/imgproxy/${key}`)
			.join(" ");

		try {
			await $`aws ssm delete-parameter --name ${signingParameters}`;
		} catch (error) {
			if (error instanceof ExecaError) {
				console.error(error.message); // true
				if (error.cause) {
					console.error(error.cause);
				}
			}
		}

		return;
	}

	for (const key of [
		"IMGPROXY_KEY",
		"IMGPROXY_SALT",
	] as unknown as (keyof typeof signingEnvironment)[]) {
		if (signingEnvironment[key] === undefined) {
			const { confirmGenerate } = await prompts({
				type: "confirm",
				name: "confirmGenerate",
				message: `URL signing is enabled but ${key} not found. Generate now?`,
			});

			if (!confirmGenerate) {
				return;
			}
			signingEnvironment[key] = (await $`xxd -g 2 -l 64 -c 64 -p /dev/random`).stdout;
		}
	}

	for (const [key, value] of Object.entries(signingEnvironment)) {
		if (value) {
			const { confirmWrite } = await prompts({
				type: "confirm",
				name: "confirmWrite",
				message: "New is enabled but (key/salt) not found. Generate now?",
			});

			if (confirmWrite) {
				// > Set SSM
				putParameter(
					`/${SYSTEMS_MANAGER_PARAMETERS_BASE_PATH}/imgproxy/${key}`,
					value,
					ssm.ParameterType.SECURE_STRING,
					ssm.ParameterTier.STANDARD,
					true,
				);

				// > Set KVS
			}
		} else {
			const { confirmDelete } = await prompts({
				type: "confirm",
				name: "confirmDelete",
				message: "${key} is not set. Delete parameter?",
			});

			if (confirmDelete) {
				// > Delete SSM

				putParameter(
					`/${SYSTEMS_MANAGER_PARAMETERS_BASE_PATH}/imgproxy/${key}`,
					value,
					ssm.ParameterType.SECURE_STRING,
					ssm.ParameterTier.STANDARD,
					true,
				);
				// > Delete KVS
			}
		}
	}
}

try {
	const { stdout } = await $`aws sts get-caller-identity`;
	console.log(stdout, "\n");
} catch (error) {
	if (error instanceof ExecaError) {
		console.error(error.message); // true
		if (error.cause) {
			console.error(error.cause);
		}
	}

	const response = await prompts({
		type: "confirm",
		name: "confirmed",
		message: "Can you confirm?",
	});
}

const KEY = "IMGPROXY_HEALTH_CHECK_MESSAGE";
const VALUE = imgproxyEnvironment[KEY];

const nameRegexp = /^\s*Name:\s+([a-zA-Z0-9_.-\/]+)/;
const errors: Error[] = [];

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

for (const [k, v] of Object.entries(imgproxyEnvironment)) {
	console.log(`${k} -> ${v}`);
	// 	const { stdout } = await $`aws ssm put-parameter \
	//             --name /imgproxy/testing/${KEY} \
	//             --value ${`"${VALUE}"`} \
	//             --type String \
	//             --tier Standard \
	// 			   --overwrite`;

	// 	console.log(stdout);
	// }
}

async function putParameter(
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
			console.error(error.message); // true
			console.error(error.cause);
		}
	}
}
