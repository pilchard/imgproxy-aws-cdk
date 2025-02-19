#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ImageOptimizationStack } from "../lib/image-optimization-stack";

import { getConfig } from "../lib/config";

const app = new cdk.App();
const config = getConfig();

new ImageOptimizationStack(app, "ImgTransformationStack", { config });
