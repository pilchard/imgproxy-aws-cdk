import { configSigningDisabled, configSimpleSigning } from "./kvs-configs";

import type { FunctionEventRequest, FunctionRequestEvent } from "@pilchard/aws-cloudfront-function";
import type { UrlRewriteConfig } from "../..";

// // /dev/random signing
export const signingTestData: {
	label: string;
	event: FunctionRequestEvent;
	config: UrlRewriteConfig;
	expected: FunctionEventRequest;
}[] = [{
	/** S I G N I N G */
	label: "signing: simple",
	event: {
		version: "1.0",
		context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
		viewer: { ip: "1.2.3.4" },
		request: {
			method: "GET",
			uri: "/PDxCsU6y6iLkdexDLyHHb4LPEvUmY5r9mWg9updCChY/rs:fill:300:400:0:0:ce/preset:square/w:10/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn",
			headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
			querystring: {},
			cookies: {},
		},
	},
	config: configSimpleSigning,
	expected: {
		method: "GET",
		uri: "/TPlLoIz8WrKV0brweeWaIEOMJS0euuuMIMXYh2Wjzc0/rt:fill/w:300/h:400/el:0/ex:0:ce/pr:square/w:10/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn",
		querystring: {},
		headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
		cookies: {},
	},
}, {
	label: "signing: disabled",
	event: {
		version: "1.0",
		context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
		viewer: { ip: "1.2.3.4" },
		request: {
			method: "GET",
			uri: "/unsigned/rs:fill:300:400:0/preset:square/w:10/plain/https://domain.com/images/image.jgp",
			headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
			querystring: {},
			cookies: {},
		},
	},
	config: configSigningDisabled,
	expected: {
		method: "GET",
		uri: "/unsigned/rt:fill/w:300/h:400/el:0/pr:square/w:10/plain/https://domain.com/images/image.jgp",
		querystring: {},
		headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
		cookies: {},
	},
}];
