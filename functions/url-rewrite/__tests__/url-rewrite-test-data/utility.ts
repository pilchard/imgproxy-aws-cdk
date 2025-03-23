import crypto from "node:crypto";

import type { FunctionEventRequest, FunctionRequestEvent } from "@pilchard/aws-cloudfront-function";
import type { UrlRewriteConfig } from "../../index";

export function mapRawData(rawData: [string, string[], string[]][], config: UrlRewriteConfig) {
	let c = 0;
	return rawData.map(([label, options, expected], i, arr) => {
		c = (arr[i - 1] && arr[i - 1][0] === label) ? c + 1 : 0;
		return _testDataFromOptions(`${label} ${c}`, options, expected, config);
	});
}

const sourceUrl =
	"aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn";

// Viewer-Request Event base
const baseEvent: FunctionRequestEvent = {
	version: "1.0",
	context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
	viewer: { ip: "1.2.3.4" },
	request: {
		method: "GET",
		uri: "",
		headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
		querystring: {},
		cookies: {},
	},
};

const _hexDecode = (hex: string) => Buffer.from(hex, "hex");

const _sign = (salt: string, target: string, secret: string, size: number) => {
	const hmac = crypto.createHmac("sha256", _hexDecode(secret));
	hmac.update(_hexDecode(salt));
	hmac.update(target);

	return Buffer.from(hmac.digest().slice(0, size)).toString("base64url");
};

function _testDataFromOptions(
	label: string,
	inputOptions: string[],
	expectedOptions: string[],
	config: UrlRewriteConfig,
) {
	const { imgproxy_salt, imgproxy_key, imgproxy_signature_size } = config;
	const signingEnabled = !!(imgproxy_salt.length && imgproxy_key.length);

	const inputUri = `/${inputOptions.join("/")}/${sourceUrl}`;
	const inputSignature = signingEnabled
		? _sign(imgproxy_salt, inputUri, imgproxy_key, imgproxy_signature_size)
		: "unsigned";
	const signedInputUri = `/${inputSignature}${inputUri}`;

	const event: FunctionRequestEvent = { ...baseEvent, request: { ...baseEvent.request, uri: signedInputUri } };

	const outputUri = `/${expectedOptions.join("/")}/${sourceUrl}`;
	const outputSignature = signingEnabled
		? _sign(imgproxy_salt, outputUri, imgproxy_key, imgproxy_signature_size)
		: "unsigned";
	const signedOutputUri = `/${outputSignature}${outputUri}`;

	const expected: FunctionEventRequest = { ...baseEvent.request, uri: signedOutputUri };

	return { label, event, config, expected };
}
