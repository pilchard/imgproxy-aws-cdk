import type {
	CloudFrontKvsFormatLabel,
	CloudFrontKvsGetOptions,
	CloudFrontKvsMetaDataResponse,
	CloudFrontRuntimeModule,
} from "@pilchard/aws-cloudfront-function";

export const key_value_store: Map<string, string> = new Map();
// key_value_store.set(
// 	"config",
// 	JSON.stringify({
// 		imgproxy_salt: "simplesalt",
// 		imgproxy_key: "simplekey",
// 		imgproxy_signature_size: 32,
// 		imgproxy_trusted_signatures: [],
// 		imgproxy_arguments_separator: ":",
// 		log_level: "error",
// 	}),
// );
const cloudfront: Pick<CloudFrontRuntimeModule, "kvs"> = {
	kvs() {
		return {
			async get(key: string, options?: CloudFrontKvsGetOptions<CloudFrontKvsFormatLabel>) {
				if (!key_value_store.has(key)) {
					throw new Error("KeyNotFound");
				}

				const format = options?.format ?? "string";

				if (!["string", "json", "bytes"].includes(format)) {
					throw new Error("UnknownFormat");
				}

				const strValue = String(key_value_store.get(key));

				switch (format) {
					case "string":
						return strValue;
					case "json":
						return JSON.parse(strValue);
					case "bytes":
						return Buffer.from(strValue, "base64");
				}
			},

			async exists(key: string) {
				return key_value_store.has(key);
			},
			async meta() {
				const metaData: CloudFrontKvsMetaDataResponse = {
					creationDateTime: new Date().toISOString(),
					lastUpdatedDateTime: new Date().toISOString(),
					keyCount: key_value_store.size,
				};
				return metaData;
			},
		};
	},
};

export default cloudfront;
