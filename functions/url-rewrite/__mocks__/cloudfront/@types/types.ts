declare namespace AWSCloudFront {
	type KeyValueStore = {
		kvs: () => Handle;
		// updateRequestOrigin: () => void;
		// selectRequestOriginById: () => void;
		// createRequestOriginGroup: () => void;
	};

	type ValueFormatLabel = "string" | "json" | "bytes";
	type ValueFormat<T> = T extends "string" ? string : T extends "json" ? unknown : T extends "bytes" ? Buffer : never;

	type Handle = {
		get: <K extends ValueFormatLabel>(key: string, options: { format: K; }) => Promise<ValueFormat<K>>;
		exists: (key: string) => Promise<boolean>;
		meta: () => Promise<MetaDataResponse>;
	};

	type MetaDataResponse = {
		/**
		 * The date and time that the key value store was created, in ISO 8601 format.
		 */
		creationDateTime: string;
		/**
		 * The date and time that the key value store was last synced from the source, in ISO 8601 format. The value doesn't include the propagation time to the edge.
		 */
		lastUpdatedDateTime: string;
		/**
		 * The total number of keys in the KVS after the last sync from the source.
		 */
		keyCount: number;
	};
}
