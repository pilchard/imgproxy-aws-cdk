import { bgBlueBright, blueBright, cyanBright, greenBright, red, white } from "ansis";
import { $, ExecaError } from "execa";
import prompts from "prompts";
import { getConfig, type ConfigProps } from "./config.ts";

export async function postDestroy() {
	console.log(bgBlueBright`\nImgproxy post-destroy\n`);

	let config: ConfigProps;

	try {
		config = getConfig();
	} catch (error) {
		if (error instanceof Error) {
			console.error(red`${error.message}`);
		}
		return;
	}

	const { CDK_DEPLOY_ACCOUNT, CDK_DEPLOY_REGION, ECR_REPOSITORY_NAME, SYSTEMS_MANAGER_PARAMETERS_PATH } = config;

	const { stdout: callerIdentityJson } = await $`aws sts get-caller-identity --output json`;
	const { Account: callerAccount } = JSON.parse(callerIdentityJson);

	// confirm deploy account and region
	if (CDK_DEPLOY_ACCOUNT === undefined || CDK_DEPLOY_REGION === undefined) {
		throw new Error("Unable to determine CDK_DEPLOY_ACCOUNT or CDK_DEPLOY_REGION");
	}

	// confirm cli caller account identity
	if (callerAccount !== CDK_DEPLOY_ACCOUNT) {
		console.error(
			red`CLI must be invoked with the account being deployed to. Expected ${white`${CDK_DEPLOY_ACCOUNT}`} but received ${white`${callerAccount}`}`,
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
					console.log(red`- ${param}`);
					const { stdout: _deletedParam } = await $`aws ssm delete-parameter --name ${param}`;
					// console.log(deletedParam);
				}
				console.log(greenBright`SSM Parameter deletion complete\n`);
			} else {
				console.log(red`SSM Parameter deletion aborted\n`);
			}
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

			const { stdout: _imgproxyEcrDeleteJson } = await $`aws ecr delete-repository \
					--repository-name ${ECR_REPOSITORY_NAME} \
					--force \
					--output json`;

			console.log(greenBright`ECR Repository deletion complete\n`);
		} else {
			console.log(red`ECR Repository deletion aborted\n`);
		}

		console.log(blueBright`\nImgproxy post-destroy complete`);
	} catch (error) {
		if (error instanceof ExecaError) {
			console.error(error.message);
			if (error.cause) {
				console.error(error.cause);
			}
		}
	}
}

postDestroy();
