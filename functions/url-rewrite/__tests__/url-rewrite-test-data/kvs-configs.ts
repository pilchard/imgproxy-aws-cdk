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
	imgproxy_trusted_signatures: ["trusted_signature"],
	imgproxy_arguments_separator: ":",
	log_level: "error",
};

export const configRealisticSigning: UrlRewriteConfig = {
	imgproxy_salt:
		"c774f6f92c1931154924af05951ae35d2ecaac6426b2db274d9876b55980703dbbeb461c44b3afc2efb65c91df13fc5ca1bf32240bebe028e26e89bc93c6b8ed",
	imgproxy_key:
		"3c033626accc2208842c57f710bb5ad7f732a3bb3ee4d40b69ec9c99cace8b5bbca6be3af8be5b57042fc7f850d40f1e42e052bb5114350959ddeff719bf0703",
	imgproxy_signature_size: 32,
	imgproxy_trusted_signatures: ["trusted_signature"],
	imgproxy_arguments_separator: ":",
	log_level: "error",
};

export const configRealisticSigningShort: UrlRewriteConfig = {
	imgproxy_salt:
		"c774f6f92c1931154924af05951ae35d2ecaac6426b2db274d9876b55980703dbbeb461c44b3afc2efb65c91df13fc5ca1bf32240bebe028e26e89bc93c6b8ed",
	imgproxy_key:
		"3c033626accc2208842c57f710bb5ad7f732a3bb3ee4d40b69ec9c99cace8b5bbca6be3af8be5b57042fc7f850d40f1e42e052bb5114350959ddeff719bf0703",
	imgproxy_signature_size: 12,
	imgproxy_trusted_signatures: ["trusted_signature"],
	imgproxy_arguments_separator: ":",
	log_level: "error",
};
