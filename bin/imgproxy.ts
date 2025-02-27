#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { getConfig } from "../lib/config";
import { ImgproxyStack } from "../lib/imgproxy-stack";

import type { AwsEnvStackProps } from "../lib/imgproxy-stack";

const config = getConfig();
const stackProps: AwsEnvStackProps = {
	env: {
		account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
	},
	config: getConfig(),
};

const app = new cdk.App();
/**
 * @see: https://yshen4.github.io/infrastructure/AWS/CDK_context.html
 *
 * // const envEU = { account: "2383838383", region: "eu-west-1" };
 * // new euStack(app, "f3cat-stack-eu", { env: envEU });
 *
 * // const envNA = { account: "8373873873", region: "us-east-1" };
 * // new naStack(app, "f3cat-stack-us", { env: envNA });
 *
 * // new desktopStack(app, "desktop", {
 * // 	env: {
 * // 		account: process.env.CDK_DEFAULT_ACCOUNT,
 * // 		region: process.env.CDK_DEFAULT_REGION,
 * // 	},
 * // });
 *
 * // new desktopStack(app, "desktop", {
 * // 	env: {
 * // 		account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
 * // 		region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
 * // 	},
 * // });
 */

new ImgproxyStack(app, config.STACK_NAME, stackProps);
