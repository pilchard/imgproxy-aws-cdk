import { configSigningDisabled } from "./kvs-configs";

import type { FunctionEventRequest, FunctionRequestEvent } from "@pilchard/aws-cloudfront-function";
import type { UrlRewriteConfig } from "../..";

// // /dev/random signing
const targetFormatRawData: { label: string; input: string; expected: string; config: UrlRewriteConfig; }[] = [
	// plain
	{
		label: "targetFormat: plain/...*.jpg",
		input: "/unsigned/plain/https://domain.com/images/image.jgp",
		expected: "/unsigned/plain/https://domain.com/images/image.jgp",
		config: configSigningDisabled,
	},
	{
		label: "targetFormat: plain/...*.jpg@webp",
		input: "/unsigned/plain/https://domain.com/images/image.jgp@webp",
		expected: "/unsigned/f:webp/plain/https://domain.com/images/image.jgp",
		config: configSigningDisabled,
	},
	{
		label: "targetFormat: f:jpg/plain/...*.jpg@webp",
		input: "/unsigned/f:jpg/plain/https://domain.com/images/image.jgp@webp",
		expected: "/unsigned/f:jpg/f:webp/plain/https://domain.com/images/image.jgp",
		config: configSigningDisabled,
	},
	{
		label: "targetFormat: f:jpg/plain/...*.jpg",
		input: "/unsigned/f:jpg/plain/https://domain.com/images/image.jgp",
		expected: "/unsigned/f:jpg/plain/https://domain.com/images/image.jgp",
		config: configSigningDisabled,
	},
	// encoded
	{
		label: "targetFormat: .../encoded",
		input: "/unsigned/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/TWpVek5USUAuanBn",
		expected: "/unsigned/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/TWpVek5USUAuanBn",
		config: configSigningDisabled,
	},
	{
		label: "targetFormat: .../encoded.webp",
		input: "/unsigned/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/TWpVek5USUAuanBn.webp",
		expected: "/unsigned/f:webp/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/TWpVek5USUAuanBn",
		config: configSigningDisabled,
	},
	{
		label: "targetFormat: f:jpg/encoded.webp",
		input: "/unsigned/f:jpg/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/TWpVek5USUAuanBn.webp",
		expected: "/unsigned/f:jpg/f:webp/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/TWpVek5USUAuanBn",
		config: configSigningDisabled,
	},
	{
		label: "targetFormat: jpg/encoded",
		input: "/unsigned/f:jpg/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/TWpVek5USUAuanBn",
		expected: "/unsigned/f:jpg/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/TWpVek5USUAuanBn",
		config: configSigningDisabled,
	},
];

const eventBase: FunctionRequestEvent = {
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
const expectedBase: FunctionEventRequest = {
	method: "GET",
	uri: "",
	querystring: {},
	headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
	cookies: {},
};

export const targetFormatTestData =
	((
		data: { label: string; input: string; expected: string; config: UrlRewriteConfig; }[],
	): { label: string; event: FunctionRequestEvent; config: UrlRewriteConfig; expected: FunctionEventRequest; }[] => {
		return data.map((d) => {
			return {
				label: d.label,
				event: { ...eventBase, request: { ...eventBase.request, uri: d.input } },
				expected: { ...expectedBase, uri: d.expected },
				config: d.config,
			};
		});
	})(targetFormatRawData);
