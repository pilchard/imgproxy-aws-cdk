export namespace UrlRewrite {
	export type Config = {
		imgproxy_salt: string;
		imgproxy_key: string;
		imgproxy_signature_size: number;
		imgproxy_trusted_signatures: string[];
		imgproxy_arguments_separator: string;
		log_level: LogLevel;
	};
	export type LogLevel = "none" | "error" | "warn" | "info" | "debug";
}
