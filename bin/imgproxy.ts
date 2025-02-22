#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ImgproxyStack } from "../lib/imgproxy-stack";

import { getConfig } from "../lib/config";

const app = new cdk.App();
const config = getConfig();

new ImgproxyStack(app, "ImgproxyStack", { config });
