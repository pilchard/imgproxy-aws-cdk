// import { cyanBright, greenBright, red, white, yellowBright } from "ansis";
// import { aws_ssm as ssm } from "aws-cdk-lib";
// import { parse } from "dotenv";
// import { $, execa, ExecaError } from "execa";
// import { readFileSync } from "node:fs";
// import { resolve } from "node:path";
// import prompts from "prompts";
// import { getConfig, parseArray, parseNumber } from "../bin/config.ts";

// import type { LogLevel, UrlRewriteConfig } from "../functions/url-rewrite/index.ts";
// import type { Option } from "../functions/utility";

// import cdkJson from "../cdk.json";

// const deployOutputsPath = resolve(process.cwd(), cdkJson.outputsFile);
// console.log(deployOutputsPath);

// const imgproxyStackOutput = {
// 	kvsArn: "arn:aws:cloudfront::376129853286:key-value-store/e851eb6c-e479-41f0-9dcb-d093a0cc2cf5",
// };

// try {
// 	const { stdout: kvsDescriptionJson } = await $`aws cloudfront-keyvaluestore describe-key-value-store \
// 				--kvs-arn ${imgproxyStackOutput.kvsArn} \
//                 --output json`;
// 	console.log(kvsDescriptionJson);
// 	const { ETag } = JSON.parse(kvsDescriptionJson);

// 	const puts: { Key: string; Value: string; }[] = [{ Key: "puts", Value: "plus stup" }];
// 	const deletes: { Key: string; }[] = [{ Key: "kvs_test" }, { Key: "test_string" }]; //

// 	// put
// 	const { stdout } = await $`aws cloudfront-keyvaluestore update-keys \
// 					--kvs-arn ${imgproxyStackOutput.kvsArn} \
// 					--if-match ${ETag} \
// 					--puts ${JSON.stringify(puts)} \
// 					--deletes ${JSON.stringify(deletes)} \
//                     --output json`;
// 	console.log(stdout);
// } catch (error) {
// 	if (error instanceof ExecaError) {
// 		console.error(error.message);
// 		if (error.cause) {
// 			console.error(error.cause);
// 		}
// 	}
// }
