export const event1: AWSCloudFrontFunction.Event = {
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
	response: { statusCode: 0 },
};
