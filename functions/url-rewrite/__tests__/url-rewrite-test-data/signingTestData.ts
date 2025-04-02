import {
	configRealisticSigning,
	configRealisticSigningShort,
	configSigningDisabled,
	configSimpleSigning,
} from "./kvs-configs";

import type {
	FunctionEventRequest,
	FunctionEventResponse,
	FunctionRequestEvent,
} from "@pilchard/aws-cloudfront-function";
import type { UrlRewriteConfig } from "../..";

// // /dev/random signing
export const signingSuccessTestData: {
	label: string;
	event: FunctionRequestEvent;
	config: UrlRewriteConfig;
	expected: FunctionEventRequest;
}[] = [{
	/** S I G N I N G */
	label: "signing: simple",
	config: configSimpleSigning,
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
	expected: {
		method: "GET",
		uri: "/TPlLoIz8WrKV0brweeWaIEOMJS0euuuMIMXYh2Wjzc0/rt:fill/w:300/h:400/el:0/ex:0:ce/pr:square/w:10/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn",
		querystring: {},
		headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
		cookies: {},
	},
}, {
	label: "signing: disabled",
	config: configSigningDisabled,
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
	expected: {
		method: "GET",
		uri: "/unsigned/rt:fill/w:300/h:400/el:0/pr:square/w:10/plain/https://domain.com/images/image.jgp",
		querystring: {},
		headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
		cookies: {},
	},
}, {
	label: "signing: realistic",
	config: configRealisticSigning,
	event: {
		version: "1.0",
		context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
		viewer: { ip: "1.2.3.4" },
		request: {
			method: "GET",
			uri: "/PCD0VZf4KLUIJCu97tjjrlBZvZ_48TVrL5vhBA9i010/resize:fill::400:false:false:ce/preset:square/width:10/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn",
			headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
			querystring: {},
			cookies: {},
		},
	},
	expected: {
		method: "GET",
		uri: "/bVKO2IB--3F4Nez5JZQ6bE8FK4eFKlMdwuqe4ujkTjg/rt:fill/h:400/el:0/ex:0:ce/pr:square/w:10/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn",
		querystring: {},
		headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
		cookies: {},
	},
}, {
	label: "signing: realistic, short",
	config: configRealisticSigningShort,
	event: {
		version: "1.0",
		context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
		viewer: { ip: "1.2.3.4" },
		request: {
			method: "GET",
			uri: "/PCD0VZf4KLUIJCu9/resize:fill::400:false:false:ce/preset:square/width:10/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn",
			headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
			querystring: {},
			cookies: {},
		},
	},
	expected: {
		method: "GET",
		uri: "/bVKO2IB--3F4Nez5/rt:fill/h:400/el:0/ex:0:ce/pr:square/w:10/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn",
		querystring: {},
		headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
		cookies: {},
	},
}, {
	label: "signing: trusted signature",
	config: configSimpleSigning,
	event: {
		version: "1.0",
		context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
		viewer: { ip: "1.2.3.4" },
		request: {
			method: "GET",
			uri: "/trusted_signature/rs:fill:300:400:0/preset:square/w:10/plain/https://domain.com/images/image.jgp",
			headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
			querystring: {},
			cookies: {},
		},
	},
	expected: {
		method: "GET",
		uri: "/trusted_signature/rt:fill/w:300/h:400/el:0/pr:square/w:10/plain/https://domain.com/images/image.jgp",
		querystring: {},
		headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
		cookies: {},
	},
}];

export const signingFailureTestData: {
	label: string;
	event: FunctionRequestEvent;
	config: UrlRewriteConfig;
	expected: FunctionEventRequest | FunctionEventResponse;
}[] = [{
	label: "signing: verification failed",
	config: configSimpleSigning,
	event: {
		version: "1.0",
		context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
		viewer: { ip: "1.2.3.4" },
		request: {
			method: "GET",
			uri: "/failedsignature/rs:fill:300:400:0/preset:square/w:10/plain/https://domain.com/images/image.jgp",
			headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
			querystring: {},
			cookies: {},
		},
	},
	expected: {
		statusCode: 403,
		statusDescription: "Forbidden",
		body: "Signature verification failed",
		headers: {},
		cookies: {},
	},
}, {
	label: "signing: signature missing",
	config: configSimpleSigning,
	event: {
		version: "1.0",
		context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
		viewer: { ip: "1.2.3.4" },
		request: {
			method: "GET",
			uri: "/rs:fill:300:400:0/preset:square/w:10/plain/https://domain.com/images/image.jgp",
			headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
			querystring: {},
			cookies: {},
		},
	},
	expected: {
		statusCode: 400,
		statusDescription: "Bad Request",
		body: "Unable to parse URI",
		headers: {},
		cookies: {},
	},
}, {
	label: "signing: signature missing",
	config: configSimpleSigning,
	event: {
		version: "1.0",
		context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
		viewer: { ip: "1.2.3.4" },
		request: {
			method: "GET",
			uri: "/rs:fill:300:400:0/preset:square/w:10/plain/https://domain.com/images/image.jgp",
			headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
			querystring: {},
			cookies: {},
		},
	},
	expected: {
		statusCode: 400,
		statusDescription: "Bad Request",
		body: "Unable to parse URI",
		headers: {},
		cookies: {},
	},
}];
