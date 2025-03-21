import { beforeAll, describe, expect, test } from "vitest";

import cf, { key_value_store } from "cloudfront";

beforeAll(async () => {
	key_value_store.set(
		"config",
		JSON.stringify({
			imgproxy_salt: "salt",
			imgproxy_key: "key",
			imgproxy_signature_size: 32,
			imgproxy_trusted_signatures: [],
			imgproxy_arguments_separator: ":",
			log_level: "none",
		}),
	);
});

describe("cloudfront module mock", () => {
	const handle = cf.kvs();

	test("module returns kvs handle", () => {
		expect(handle).toBeDefined();
	});

	test("'config' key exists", async () => {
		const exists = await handle.exists("config");
		expect(exists).toBeTruthy();
		expect(handle.meta()).toBeTruthy();
	});

	test("meta is returned ", async () => {
		const meta = await handle.meta();
		expect(meta).toBeDefined();
		expect(meta.keyCount).toEqual(1);
	});

	test("config can be retrieved", async () => {
		const config = await handle.get("config", { format: "json" });
		expect(config).toBeDefined();
	});

	test("config values to be as set", async () => {
		const config = await handle.get("config", { format: "json" });
		expect(config).toMatchObject({
			imgproxy_salt: "salt",
			imgproxy_key: "key",
			imgproxy_signature_size: 32,
			imgproxy_trusted_signatures: [],
			imgproxy_arguments_separator: ":",
			log_level: "none",
		});
	});
});
