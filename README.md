# Imgproxy with AWS CloudFront

<!-- <img src="architecture.png" width="900"> -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./architecture-dark.png">
  <img alt="AWS diagram" src="./architecture.png">
</picture>

## Deploy with AWS CDK

### Prerequisites

Before proceeding with deployment ensure the following:

- **Docker** is installed and configured. see: [Get Docker](https://docs.docker.com/get-started/get-docker/)

- The **AWS CLI** is installed and configured. see: [AWS CLI install and update instructions](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html#getting-started-install-instructions)

### Deploy

#### 1. Pull repository and install node modules

```terminal
git clone https://github.com/pilchard/imgproxy-aws-cdk.git
cd imgproxy-aws-cdk
pnpm install
```

#### 2. Copy sample `.env` files into place

Edit these configuration files to customize the deployment. The stack will deploy using the same reasonable default values if these files are not found or if they are copied into place but not edited.

```terminal
cp .env.sample .env
cp .imgproxy.env.sample .imgproxy.env
```

> [!NOTE]
> Deploying without editing `.env` will read deploy target `account` and `region` from the default profile in `~/.aws/config` (the default profile may be overridden by `AWS_PROFILE` if it is set).

> [!TIP]
> Set the `CDK_DEPLOY_PROFILE` value in `.env` to read the deploy target `account` and `region` from a non-default profile in `~/.aws/config`.

#### 3. Build

The build script will typecheck the project and package the optional URL-rewrite CloudFront Function for deployment.

```terminal
pnpm run build
```

#### 4. Bootstrap CDK environment and deploy

```terminal
pnpm run bootstrap
pnpm run deploy
```

Upon running `pnpm run deploy`, a pre-deploy script will run to create the required ECR repository and deploy the latest imgproxy Docker container image to it.

After the CDK Deploy process is successful, a post-deploy script will handle initialization of imgproxy signing parameters (if enabled) and sync configuration values from `.imgproxy.env` to SSM Parameters accessible by the Lambda Function.

Finally, deployment details will be output including the domain of the CloudFront distribution and the name of the default S3 buckets. A number of example URLs will also be generated for the sample images included in the project.

> [!NOTE]
> The first sample URL to be opened may take several seconds to load as the Lambda cold starts after the deploy. Subsequent links should open immediately.

## Configuration

#### Stack

To customize the deployment copy the included `.env.sample` to `.env` and edit the settings as needed.

```shell
cp .env.sample .env
```

#### Imgproxy Lambda

To set SSM Parameters for the Imgproxy Lambda Function create an `imgrproxy.env` file at the root of your project (or copy the provided sample) and set the configuration as needed.

```shell
cp imgproxy.env.sample imgproxy.env
```

## Clean up resources

To remove cloud resources created during deploy run the `destroy` script.

```shell
pnpm run destroy
```

---

## Manual ECR Repository setup

Running the deploy as pulled will create the required ECR repository and handle pulling and deploying the imgproxy Docker image for you. If you would like to do this manually you can set `ECR_CREATE_REPOSITORY=false` in your `.env` file and follow the directions below.

The stack defaults to deploying the latest build of the official Docker image of the OSS version of imgproxy — `ghcr.io/imgproxy/imgproxy:latest`. If you want to use a specific version of imgproxy, replace `'latest'` with the desired version tag. If using a specific version of imgproxy, ensure it is version 3.22.0 or later. Docker images of versions earlier than this don't include the necessary AWS Lambda adapter.

The commands that follow assume that you have already created an ECR repository named `'imgproxy'` and are using place holders of `'us-east-1'` and `'123456789'` for AWS region and AWS account ID respectively. Be sure to replace each of these with the relevant values for your deployment before running the commands.

See the AWS documentation for more details: [Pushing a Docker image to an Amazon ECR private repository](https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html)

#### 1. Authenticate your Docker client with the ECR registry

Replace all instances of region (us-east-1) and account ID (123456789) with your actual region and account ID

```shell
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
```

#### 2. Pull the imgproxy Docker image

```shell
docker pull ghcr.io/imgproxy/imgproxy:latest-arm64
```

> [!NOTE]
> The Docker image tag is suffixed with `-arm64`. This is because we're going to run imgproxy on AWS Lambda with Graviton processors, and this suffix ensures that we're using an image built for ARM64 architecture.

#### 3. Tag the pulled Docker image for ECR

The AWS tag structure is as follows:`<account_id>.dkr.ecr.<region>.amazonaws.com/<ecr_repo_name>:<ecr_image_tag>`. Replace each of these with the relevant values for your deployment making sure that the ECR Repository name matches the ECR repository that exists in your account.

```shell
docker tag ghcr.io/imgproxy/imgproxy:latest-arm64 123456789.dkr.ecr.us-east-1.amazonaws.com/imgproxy:latest
```

> [!NOTE]
> The tag `:latest` is used here which matches the default configuration of the stack. If you use a different tag be sure to create a `.env` file and set `LAMBDA_ECR_REPOSITORY_TAG` to the same value (see: [Configuration](#configuration)).

#### 4. Push the tagged image to the ECR repository

The image tag you push here should match the one created in the prior command.

```shell
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/imgproxy:latest
```

##### Reference

AWS documentation: [Pushing a Docker image to an Amazon ECR private repository](https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html)\
Imgproxy blog: [(Almost) free image processing with imgproxy and AWS Lambda](https://imgproxy.net/blog/almost-free-image-processing-with-imgproxy-and-aws-lambda/).

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
