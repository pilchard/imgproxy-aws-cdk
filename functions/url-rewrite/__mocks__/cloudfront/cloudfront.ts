import path from "node:path";
import { parseArray } from "../../../../lib/config";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
import * as dotenv from "dotenv";

import type { AWSCloudFront } from "./types";

dotenv.config({ path: path.resolve(__dirname, "../../../.imgproxy.env") });

export const key_value_store: Record<string, string> = {
	config: JSON.stringify({
		imgproxy_salt: process.env.IMGPROXY_SALT || "",
		imgproxy_key: process.env.IMGPROXY_KEY || "",
		imgproxy_signature_size: process.env.IMGPROXY_SIGNATURE_SIZE || 32,
		imgproxy_trusted_signatures: parseArray(process.env.IMGPROXY_TRUSTED_SIGNATURES) ?? [],
		imgproxy_arguments_separator: process.env.IMGPROXY_SIGNATURE_SIZE || ":",
		log_level: "debug",
	}),
};

const cloudfront: AWSCloudFront.KeyValueStore = {
	kvs() {
		return {
			async get(key, format) {
				const strValue = key_value_store[key];
				switch (format.format) {
					case "string":
						return strValue;
					case "json":
						return JSON.parse(strValue);
					case "bytes":
						return Buffer.from(strValue, "utf8");
				}
			},
			async exists(key) {
				return key in key_value_store;
			},
			async meta() {
				const created = new Date();
				created.setDate(created.getDate() - 5);
				return {
					creationDateTime: created.toISOString(),
					lastUpdatedDateTime: (new Date()).toISOString(),
					keyCount: Object.keys(key_value_store).length,
				};
			},
		};
	},
};

export default cloudfront;
