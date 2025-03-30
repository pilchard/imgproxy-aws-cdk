import { configSigningDisabled } from "./kvs-configs";

import type { FunctionEventRequest, FunctionRequestEvent } from "@pilchard/aws-cloudfront-function";
import type { UrlRewriteConfig } from "../..";

// // /dev/random signing
export const targetFormatTestData: {
	label: string;
	event: FunctionRequestEvent;
	config: UrlRewriteConfig;
	expected: FunctionEventRequest;
}[] = [{
	label: "targetFormat: plain/...*.jpg@webp",
	event: {
		version: "1.0",
		context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
		viewer: { ip: "1.2.3.4" },
		request: {
			method: "GET",
			uri: "/unsigned/plain/https://domain.com/images/image.jgp@webp",
			headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
			querystring: {},
			cookies: {},
		},
	},
	config: configSigningDisabled,
	expected: {
		method: "GET",
		uri: "/unsigned/f:webp/plain/https://domain.com/images/image.jgp",
		querystring: {},
		headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
		cookies: {},
	},
}];
