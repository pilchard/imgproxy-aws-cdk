import { expect, test } from "vitest";

import { handler } from "../index";

import { key_value_store } from "cloudfront";
import { data, metaOptionTestData, stdOptionTestData } from "../__mocks__/test-data";

test.each(data)("handle($event) -> $expected", async ({ event, config, expected }) => {
	key_value_store.set("config", JSON.stringify(config));
	const reqres = await handler(event);
	expect(reqres).toHaveProperty("uri");
	expect((<AWSCloudFrontFunction.FunctionEventRequest> reqres).uri).toBe(expected.uri);
});

test.each(metaOptionTestData)("meta-option test", async ({ event, config, expected }) => {
	key_value_store.set("config", JSON.stringify(config));
	const reqres = await handler(event);
	expect(reqres).toHaveProperty("uri");
	expect((<AWSCloudFrontFunction.FunctionEventRequest> reqres).uri).toBe(expected.uri);
});

test.each(stdOptionTestData)("standard option tests", async ({ event, config, expected }) => {
	key_value_store.set("config", JSON.stringify(config));
	const reqres = await handler(event);
	expect(reqres).toHaveProperty("uri");
	expect((<AWSCloudFrontFunction.FunctionEventRequest> reqres).uri).toBe(expected.uri);
});
