import { bgBlueBright, red } from "ansis";
// import { $ } from "execa";
import { getConfig, type ConfigProps } from "./config.ts";

export async function preDestroy() {
	console.log(bgBlueBright`\nImgproxy pre-destroy\n`);

	let config: ConfigProps;

	try {
		config = getConfig();
	} catch (error) {
		if (error instanceof Error) {
			console.error(red`${error.message}`);
		}
		return;
	}

	const { CDK_DEPLOY_ACCOUNT } = config;
	console.log(CDK_DEPLOY_ACCOUNT);

	/** @todo
	 * empty and destroy ECR repository
	 */
}
