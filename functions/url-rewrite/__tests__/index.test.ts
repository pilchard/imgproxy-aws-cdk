import { expect, test } from "vitest";

import { handler } from "../index";

import { key_value_store } from "cloudfront";
import {
	metaOptionTestData,
	signingFailureTestData,
	signingSuccessTestData,
	stdOptionTestData,
	targetFormatTestData,
} from "./url-rewrite-test-data";

test.each(signingSuccessTestData)("signing: $label", async ({ event, config, expected }) => {
	key_value_store.set("config", JSON.stringify(config));
	const reqres = await handler(event);

	expect(reqres).toHaveProperty("uri");
	expect((<AWSCloudFrontFunction.FunctionEventRequest> reqres).uri).toBe(expected.uri);
});

test.each(signingFailureTestData)("signing: $label", async ({ event, config, expected }) => {
	key_value_store.set("config", JSON.stringify(config));
	const reqres = await handler(event);

	expect(reqres).toHaveProperty("statusCode");
	expect(<AWSCloudFrontFunction.FunctionEventResponse> reqres).toStrictEqual(expected);
});

test.each(targetFormatTestData)("targetFormat: $label", async ({ event, config, expected }) => {
	key_value_store.set("config", JSON.stringify(config));
	const reqres = await handler(event);
	expect(reqres).toHaveProperty("uri");
	expect((<AWSCloudFrontFunction.FunctionEventRequest> reqres).uri).toBe(expected.uri);
});

test.each(metaOptionTestData)("meta_option: $label", async ({ event, config, expected }) => {
	key_value_store.set("config", JSON.stringify(config));
	const reqres = await handler(event);
	expect(reqres).toHaveProperty("uri");
	expect((<AWSCloudFrontFunction.FunctionEventRequest> reqres).uri).toBe(expected.uri);
});

test.each(stdOptionTestData)("std_option: $label", async ({ event, config, expected }) => {
	key_value_store.set("config", JSON.stringify(config));
	const reqres = await handler(event);
	expect(reqres).toHaveProperty("uri");
	expect((<AWSCloudFrontFunction.FunctionEventRequest> reqres).uri).toBe(expected.uri);
});
