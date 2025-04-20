import { blueBright, greenBright, red, white, yellowBright } from "ansis";
import { $ } from "execa";
import { getConfig } from "./config.ts";

type EcrRepositoryResponseObject = {
	createdAt?: string;
	encryptionConfiguration?: { encryptionType: "AES256" | "KMS" | "KMS_DSSE"; kmsKey?: string; };
	imageScanningConfiguration?: { scanOnPush?: boolean; };
	imageTagMutability?: "MUTABLE" | "IMMUTABLE";
	registryId?: string;
	repositoryArn?: string;
	repositoryName?: string;
	repositoryUri?: string;
};

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

const {
	CDK_DEPLOY_ACCOUNT,
	CDK_DEPLOY_REGION,
	ECR_CREATE_REPOSITORY,
	ECR_REPOSITORY_NAME,
	ECR_IMAGE_TAG,
	ECR_DOCKER_IMAGE_PATH,
} = getConfig();

async function destroy() {
	const { stdout: callerIdentityJson } = await $`aws sts get-caller-identity --output json`;
	const { Account: callerAccount } = JSON.parse(callerIdentityJson);

	if (callerAccount !== CDK_DEPLOY_ACCOUNT) {
		console.error(
			red`CLI must be invoked with the account being deployed to. Expected ${white`${CDK_DEPLOY_ACCOUNT}`} but received ${white`${callerAccount}`}`,
		);
		return;
	}

	/** @todo
	 * empty and destroy ECR repository
	 */
}

async function deploy() {
	console.log(blueBright`\nImgproxy pre-deploy...`);

	if (!ECR_CREATE_REPOSITORY) {
		console.info(
			white`\nSkipping ECR repository creation. In order for Lambda deployment to succeed ensure that an ECR \
			repository named ${ECR_REPOSITORY_NAME} containing an image tagged ${ECR_IMAGE_TAG} is available in \
			the default registry of the deployment account.`,
		);
		return;
	}

	// confirm Docker is installed
	const { stdout: dockerInstallation } = await $`command -v docker`;
	if (dockerInstallation === undefined) {
		console.error(red`Docker installation not found. Please install docker to continue.`);
		console.info(
			blueBright`\nFor official installation options see: ${white`https://docs.docker.com/get-started/get-docker/`}`,
		);
		throw new Error("Docker installation not found");
	}
	console.log(greenBright`\nDocker installed`);

	// confirm AWS CLI is installed
	const { stdout: awsInstallation } = await $`command -v docker`;

	if (awsInstallation === undefined) {
		console.error(red`AWS CLI installation not found. Please install the AWS CLI to continue.`);
		console.info(
			white`\nFor official installation options see: ${blueBright`https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html#getting-started-install-instructions`}`,
		);
		throw new Error("AWS CLI installation not found");
	}
	console.log(greenBright`AWS CLI installed`);

	// confirm deploy account and region
	if (CDK_DEPLOY_ACCOUNT === undefined || CDK_DEPLOY_REGION === undefined) {
		throw new Error("Unable to determine CDK_DEPLOY_ACCOUNT or CDK_DEPLOY_REGION");
	}

	// confirm cli caller account identity
	const { stdout: callerIdentityJson } = await $`aws sts get-caller-identity --output json`;
	const { Account: callerAccount } = JSON.parse(callerIdentityJson);

	if (callerAccount !== CDK_DEPLOY_ACCOUNT) {
		console.error(
			red`CLI must be logged in with the account being deployed to. Expected ${white`${CDK_DEPLOY_ACCOUNT}`} but received ${white`${callerAccount}`}`,
		);
		return;
	}

	try {
		/** create ECR repository */
		let imgproxyEcrRepo: EcrRepositoryResponseObject;
		try {
			console.log("\nChecking ECR repositories...");
			const { stdout: existingRepositoriesJson } = await $`aws ecr describe-repositories \
                    --output json`; // --query repositories[].repositoryName \

			const { repositories: existingRepositories }: { repositories: EcrRepositoryResponseObject[]; } = JSON.parse(
				existingRepositoriesJson,
			);
			const retrievedImgproxyRepository = existingRepositories.find((repo) =>
				repo.repositoryName === ECR_REPOSITORY_NAME
			);

			if (retrievedImgproxyRepository !== undefined) {
				imgproxyEcrRepo = retrievedImgproxyRepository;

				console.log(greenBright`ECR repository with name '${ECR_REPOSITORY_NAME}' found`);
			} else {
				console.log(yellowBright`ECR repository with name '${ECR_REPOSITORY_NAME}' not found`);
				console.log(white`\nCreating new ECR repository...`);
				const { stdout: imgproxyEcrRepoJson } = await $`aws ecr create-repository \
					--repository-name ${ECR_REPOSITORY_NAME} \
					--encryption-configuration encryptionType=AES256 \
					--image-tag-mutability IMMUTABLE \
    				--image-scanning-configuration scanOnPush=false \
					--output json`;

				imgproxyEcrRepo = JSON.parse(imgproxyEcrRepoJson);

				console.log(greenBright`Successfully created ECR repository`);
			}
		} catch (error) {
			throw new Error(`"Failed to retrieve or create ECR repository with name ${ECR_REPOSITORY_NAME}`, {
				cause: error,
			});
		}

		console.log("\nChecking images...");

		const { stdout: existingImageJson } = await $`aws ecr batch-get-image \
    				--repository-name ${ECR_REPOSITORY_NAME} \
    				--image-ids imageTag=${ECR_IMAGE_TAG} \
					--output json`;

		const { images: existingImageArr } = JSON.parse(existingImageJson);

		if (existingImageArr.length) {
			console.log(greenBright`Image with tag '${ECR_IMAGE_TAG}' found`);

			console.log(blueBright`\nImgproxy pre-deploy complete`);
			return;
		}

		console.log(yellowBright`Image with tag '${ECR_IMAGE_TAG}' not found`);
		console.log("\nDeploying new ECR image...");

		/** 1. Authenticate your Docker client with the ECR registry
		 * Replace all instances of region (us-east-1) and account ID (123456789) with your actual region and account ID
		 *
		 * ```shell
		 * aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
		 * ```
		 */
		console.log("\nAuthenticating Docker...");

		const { stdout: awsDockerAuthResult } = await $`aws ecr get-login-password --region ${CDK_DEPLOY_REGION}`
			.pipe`docker login --username AWS --password-stdin ${CDK_DEPLOY_ACCOUNT}.dkr.ecr.${CDK_DEPLOY_REGION}.amazonaws.com`;

		console.log(greenBright`${awsDockerAuthResult}`);

		/** 2. Pull the imgproxy Docker image
		 *
		 * ```shell
		 * docker pull ghcr.io/imgproxy/imgproxy:latest-arm64
		 * ```
		 */
		console.log("\nPulling imgproxy image...");

		await $({ stdout: "inherit", stderr: "inherit" })`docker pull ${ECR_DOCKER_IMAGE_PATH}`;

		/** 3. Tag the pulled Docker image for ECR
		 * The AWS tag structure is as follows:`<account_id>.dkr.ecr.<region>.amazonaws.com/<ecr_repo_name>:<ecr_image_tag>`. Replace each of these with the relevant values for your deployment making sure that the ECR Repository name matches the ECR repository that exists in your account.
		 *
		 * ```shell
		 * docker tag ghcr.io/imgproxy/imgproxy:latest-arm64 123456789.dkr.ecr.us-east-1.amazonaws.com/imgproxy:latest
		 * ```
		 */
		console.log("\nTagging image for AWS...");

		const awsEcrImagePath =
			`${CDK_DEPLOY_ACCOUNT}.dkr.ecr.${CDK_DEPLOY_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${ECR_IMAGE_TAG}`;
		await $({ stdout: "inherit", stderr: "inherit" })`docker tag ${ECR_DOCKER_IMAGE_PATH} ${awsEcrImagePath}`;

		console.log(greenBright`Successfully tagged image`);
		console.log(white`  ${ECR_DOCKER_IMAGE_PATH} → ${awsEcrImagePath}`);
		/** 4. Push the tagged image to the ECR repository
		 *
		 * ```shell
		 * docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/imgproxy:latest
		 * ```
		 */
		console.log("\nPushing image to ECR...");

		await $({ stdout: "inherit", stderr: "inherit" })`docker push ${awsEcrImagePath}`;

		console.log(greenBright`\nSuccessfully deployed imgproxy Docker image\n`);
		console.log(`  Docker image path: ${ECR_DOCKER_IMAGE_PATH}`);
		console.log(`  ECR image path: ${awsEcrImagePath}`);

		console.log(blueBright`\nImgproxy pre-deploy complete`);
	} catch (error) {
		if (error instanceof Error) {
			console.error(red`${error.message}`);
			if (error.cause) {
				console.error(error.cause);
			}
			throw error;
		}
		throw new Error("Unknown pre-deploy error", { cause: error });
	}
}

/**
 * Stack output logging
 */

// function logOutput(deployOutputs: ImgproxyStackDeployOutputs, signingOptions: SigningConfig) {
// 	try {
// 		if (deployOutputs.DefaultImgproxyBucketName !== undefined) {
// 			const { stdout: s3ObjectListJson } = await $`aws s3api list-objects-v2 \
// 					--bucket ${deployOutputs.DefaultImgproxyBucketName} \
// 					--output json`;

// 			const { Contents: defaultObjectPaths } = JSON.parse(s3ObjectListJson);

// 			console.log("Sample links");
// 			for (const { Key: objectUri } of defaultObjectPaths) {
// 				console.log(bgBlueBright`\n${objectUri}\n`);

// 				// s3://imgproxy-stack-imgproxystackimgproxybucket21397567-5riy5cmwkypo/imgproxy/default/Imgproxy Stack_1080x1920.png
// 				const s3Uri = `s3://${deployOutputs.DefaultImgproxyBucketName}/${objectUri}`;

// 				const encodedS3Uri = Buffer.from(s3Uri).toString("base64url");

// 				for (const [label, options] of Object.entries(processingOptions)) {
// 					const imgproxyUri = `/${options.join("/")}/${encodedS3Uri}`;
// 					let signature = "unsigned";
// 					if (shouldSign) {
// 						signature = _sign(
// 							signingOptions.imgproxy_salt,
// 							imgproxyUri,
// 							signingOptions.imgproxy_key,
// 							signingOptions.imgproxy_signature_size,
// 						);
// 					}

// 					const signedImgproxyUri = `/${signature}${imgproxyUri}`;
// 					console.log(
// 						`${label}: ${blueBright`https://${deployOutputs.ImgproxyDistributionDomainName}${signedImgproxyUri}`}`,
// 					);
// 				}
// 			}
// 		}

// 		console.log("\nDeploy outputs\n");
// 		console.log(deployOutputs);
// 	} catch (error) {
// 		if (error instanceof ExecaError) {
// 			console.error(error.message);
// 			console.error(error.cause);
// 		}
// 	}
// }
