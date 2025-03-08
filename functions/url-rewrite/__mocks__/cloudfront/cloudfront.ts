export const key_value_store: Record<string, string> = {};

const cloudfront: AWSCloudFront.KeyValueStore = {
	kvs() {
		return {
			async get(key, format) {
				const strValue = key_value_store[key] ?? "";
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
