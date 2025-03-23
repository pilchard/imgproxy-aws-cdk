import type { UrlRewriteConfig } from "../..";

export const configSigningDisabled: UrlRewriteConfig = {
	imgproxy_salt: "",
	imgproxy_key: "",
	imgproxy_signature_size: 32,
	imgproxy_trusted_signatures: [],
	imgproxy_arguments_separator: ":",
	log_level: "error",
};
export const configSimpleSigning: UrlRewriteConfig = {
	imgproxy_salt: "simplesalt",
	imgproxy_key: "simplekey",
	imgproxy_signature_size: 32,
	imgproxy_trusted_signatures: [],
	imgproxy_arguments_separator: ":",
	log_level: "error",
};
