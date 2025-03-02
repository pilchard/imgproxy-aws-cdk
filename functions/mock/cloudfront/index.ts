import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArray } from "../../../lib/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.imgproxy.env") });

const _store = {
	config: {
		imgproxy_salt: process.env.IMGPROXY_KEY || "",
		imgproxy_key: process.env.IMGPROXY_SALT || "",
		imgproxy_signature_size: process.env.IMGPROXY_SIGNATURE_SIZE || 32,
		imgproxy_trusted_signatures: parseArray(process.env.IMGPROXY_TRUSTED_SIGNATURES) ?? [],
		imgproxy_arguments_separator: process.env.IMGPROXY_SIGNATURE_SIZE || ":",
		log_level: "debug",
	},
};

const cloudfront: AWSCloudFront.KeyValueStore = {
	kvs() {
		return {
			async get(key, _format) {
				return _store[key];
			},
			async exists(key) {
				return key in _store;
			},
			async meta() {
				const created = new Date();
				created.setDate(created.getDate() - 5);
				return {
					creationDateTime: created.toISOString(),
					lastUpdatedDateTime: (new Date()).toISOString(),
					keyCount: Object.keys(_store).length,
				};
			},
		};
	},
};

export default cloudfront;
