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
// 	kvsArn: "arn:aws:cloudfront::825765411384:key-value-store/8cbd00dd-6550-4b1b-b8f4-de2d73042469",
// 	DefaultImgproxyBucketName: "imgproxy-stack-imgproxystackimgproxybucket21397567-5riy5cmwkypo",
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
// 	// const { stdout } = await $`aws cloudfront-keyvaluestore update-keys \
// 	// 				--kvs-arn ${imgproxyStackOutput.kvsArn} \
// 	// 				--if-match ${ETag} \
// 	// 				--puts ${JSON.stringify(puts)} \
// 	// 				--deletes ${JSON.stringify(deletes)} \
// 	//                 --output json`;
// 	// console.log(stdout);

// 	// S3
// 	const { stdout: s3ObjectListJson } = await $`aws s3api list-objects-v2 \
// 				--bucket ${imgproxyStackOutput.DefaultImgproxyBucketName} \
//                 --output json`;
// 	console.log(s3ObjectListJson);
// } catch (error) {
// 	if (error instanceof ExecaError) {
// 		console.error(error.message);
// 		if (error.cause) {
// 			console.error(error.cause);
// 		}
// 	}
// }
