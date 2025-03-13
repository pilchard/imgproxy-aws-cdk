// { event: AWSCloudFrontFunction.FunctionRequestEvent; config: any; }
export const data1 = {
	event: {
		version: "1.0",
		context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
		viewer: { ip: "1.2.3.4" },
		request: {
			method: "GET",
			uri: "/YxO8v7pFlkKUj_HRHfa78J-MTQlG-8H2GinL1OYb-9Y/rs:fill:418:564:0/g:sowe/h:100/preset:tall/preset:wide/g:ce/w:30/preset:cat/czM6Ly9pbWdwcm94eS1pbWFnZS1idWNrZXQvMjAyNDEyMTctRFNDXzA4MjlfY2xvc2UtY3JvcF9iLXcucG5n",
			headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
			querystring: {},
			cookies: {},
		},
	},
	config: // // /dev/random signing
		{
			imgproxy_salt:
				"68d22d598b4eeb920678441f1867273ddad173d7c0dcafbd94c3ef9084fd1b4b6ab51926ec55be7c661da7736ab30dca3093345f9e7486009c7b5bdfa2e9f65e",
			imgproxy_key:
				"fbe6ef0b67825685e696eac23a876f83a989dfbc7bfa6c8bd893fda6efecae04cab3ceb43f56cf4c450f723f8f9dbad1c0a5234bc023e6bcc78d799b39a4a717",
			imgproxy_signature_size: 32,
			imgproxy_trusted_signatures: [],
			imgproxy_arguments_separator: ":",
			log_level: "error",
		},
};
