import type {
	CloudFrontKvsFormatLabel,
	CloudFrontKvsGetOptions,
	CloudFrontKvsMetaDataResponse,
	CloudFrontRuntimeModule,
} from "@pilchard/aws-cloudfront-function";

export const key_value_store: Map<string, string> = new Map();
key_value_store.set(
	"config",
	JSON.stringify({
		imgproxy_salt:
			"68d22d598b4eeb920678441f1867273ddad173d7c0dcafbd94c3ef9084fd1b4b6ab51926ec55be7c661da7736ab30dca3093345f9e7486009c7b5bdfa2e9f65e",
		imgproxy_key:
			"fbe6ef0b67825685e696eac23a876f83a989dfbc7bfa6c8bd893fda6efecae04cab3ceb43f56cf4c450f723f8f9dbad1c0a5234bc023e6bcc78d799b39a4a717",
		imgproxy_signature_size: 32,
		imgproxy_trusted_signatures: [],
		imgproxy_arguments_separator: ":",
		log_level: "error",
	}),
);
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
