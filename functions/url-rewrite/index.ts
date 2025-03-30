/**
 * TODO:
 * [ ] inline extraneous functions
 * [ ] test/streamline code for aws-js2.0
 */

// @ts-ignore: CloudFront Function runtime import
// biome-ignore lint/style/useNodejsImportProtocol:
import crypto from "crypto";

import cf from "cloudfront";

import type {
	CloudFrontKvsFormat,
	CloudFrontKvsFormatLabel,
	CloudFrontKvsHandle,
} from "@pilchard/aws-cloudfront-function";
import type { Option } from "../utility";

export interface ImgproxyStdOption {
	full: string;
	short: string;
	alt?: string;
	caseSensitive?: boolean;
}
export interface ImgproxyMetaOption extends ImgproxyStdOption {
	metaOptions: string[];
}
export type ImgproxyOption = ImgproxyStdOption | ImgproxyMetaOption;
export type LogLevel = "none" | "error" | "warn" | "info" | "debug";

export type UrlRewriteConfig = {
	imgproxy_salt: string;
	imgproxy_key: string;
	imgproxy_signature_size: number;
	imgproxy_trusted_signatures: string[];
	imgproxy_arguments_separator: string;
	log_level: LogLevel;
};

/**
 * D A T A
 */

const imgproxyProcessingOptions: ImgproxyOption[] = [
	{ full: "resize", short: "rs", metaOptions: ["resizing_type", "width", "height", "enlarge", "extend"] },
	{ full: "size", short: "s", metaOptions: ["width", "height", "enlarge", "extend"] },
	{ full: "resizing_type", short: "rt" },
	{ full: "width", short: "w" },
	{ full: "height", short: "h" },
	{ full: "min_width", short: "mw" },
	{ full: "min_height", short: "mh" },
	{ full: "zoom", short: "z" },
	{ full: "dpr", short: "dpr" },
	{ full: "enlarge", short: "el" },
	{ full: "extend", short: "ex" },
	{ full: "extend_aspect_ratio", short: "exar", alt: "extend_ar" },
	{ full: "gravity", short: "g" },
	{ full: "crop", short: "c" },
	{ full: "trim", short: "t" },
	{ full: "padding", short: "pd" },
	{ full: "auto_rotate", short: "ar" },
	{ full: "rotate", short: "rot" },
	{ full: "background", short: "bg" },
	{ full: "blur", short: "bl" },
	{ full: "sharpen", short: "sh" },
	{ full: "pixelate", short: "pix" },
	{ full: "watermark", short: "wm" },
	{ full: "strip_metadata", short: "sm" },
	{ full: "keep_copyright", short: "kcr" },
	{ full: "strip_color_profile", short: "scp" },
	{ full: "enforce_thumbnail", short: "eth" },
	{ full: "quality", short: "q" },
	{ full: "format_quality", short: "fq" },
	{ full: "max_bytes", short: "mb" },
	{ full: "format", short: "f", alt: "ext" },
	{ full: "skip_processing", short: "skp" },
	{ full: "raw", short: "raw" },
	{ full: "cache_buster", short: "cb" },
	{ full: "expires", short: "exp" },
	{ full: "filename", short: "fn", caseSensitive: true },
	{ full: "return_attachment", short: "att" },
	{ full: "preset", short: "pr" },
	{ full: "max_src_resolution", short: "msr" },
	{ full: "max_src_file_size", short: "msfs" },
	{ full: "max_animation_frames", short: "maf" },
	{ full: "max_animation_frame_resolution", short: "mafr" },
];

const indexedOptions: Record<string, ImgproxyOption> = ((optionsArr: ImgproxyOption[]) => {
	const indexedOptions: Record<string, ImgproxyOption> = {};

	for (let i = 0; i < optionsArr.length; i++) {
		const option = optionsArr[i];

		const labelKeys = ["full", "short", "alt"] as const;
		for (let j = 0; j < labelKeys.length; j++) {
			const indexKey = option[labelKeys[j]];
			if (indexKey !== undefined) {
				indexedOptions[indexKey] = option;
			}
		}
	}
	return indexedOptions;
})(imgproxyProcessingOptions);

/**
 * G L O B A L S
 */

const logLevelMap: Record<LogLevel, { prefix: string; index: number; }> = {
	none: { prefix: "", index: 0 },
	error: { prefix: "[ERROR]", index: 1 },
	warn: { prefix: "[WARN]", index: 2 },
	info: { prefix: "[INFO]", index: 3 },
	debug: { prefix: "[DEBUG]", index: 4 },
};

const kvsHandle = cf.kvs();
const defaultConfig: UrlRewriteConfig = {
	imgproxy_salt: "",
	imgproxy_key: "",
	imgproxy_signature_size: 32,
	imgproxy_trusted_signatures: [],
	imgproxy_arguments_separator: ":",
	log_level: "none",
};

let LOG_LEVEL = resolveLogLevel("none");
let ARGS_SEP = defaultConfig.imgproxy_arguments_separator;
const PATH_SEP = "/";

/**
 * H A N D L E R
 */

export const handler: AWSCloudFrontFunction.RequestEventHandler = async function handler(event) {
	logLine(`In handler with event: ${JSON.stringify(event)}`, "debug");

	const kvsResponse = await kvsGet("config", kvsHandle, "json");

	if (kvsResponse.none !== undefined) {
		return sendError(403, "Forbidden", "", kvsResponse.none);
	}

	logLine("Config fetched from kvs", "info");

	const config = Object.assign(defaultConfig, kvsResponse.some as UrlRewriteConfig);

	logLine(`Fetched config: ${JSON.stringify(config)}`, "debug");

	// update globals
	LOG_LEVEL = resolveLogLevel(config.log_level);
	ARGS_SEP = config.imgproxy_arguments_separator;
	// PATH_SEP = "/";

	// signing settings
	const IMGPROXY_SALT = config.imgproxy_salt;
	const IMGPROXY_KEY = config.imgproxy_key;
	const IMGPROXY_SIGNATURE_SIZE = config.imgproxy_signature_size;

	/**
	 *  TODO:
	 *  [ ] implement debug response headers
	 *  [ ] implement JWT signing for debug access
	 */
	// const debugRequest = false;
	// 	LOG_LEVEL === resolveLogLevel("debug") &&
	// 	"debug" in request.headers &&
	// 	request.headers.debug.value === "true";

	const signingEnabled = !!(IMGPROXY_KEY.length && IMGPROXY_SALT.length);

	if (!signingEnabled) {
		logLine("Signing: imgproxy signing disabled", "warn");
	}

	const request = event.request;
	const requestUri = request.uri;

	logLine(`Source: ${request.headers.host.value}${request.uri}`, "debug");
	logLine("parsing uri", "info");

	const imgproxyUriRegexp = new RegExp(
		`^\\/([^\\/]+)\\/((?:[a-zA-Z_]+\\${ARGS_SEP}[^\\/]+\\/)+)?(?:(?:(plain\\/[^@]+)@?)|(?:([a-zA-Z0-9-_\\/]+)\\.?))(\\w+)?$`,
		"g",
	);

	const uriRegexpResult = imgproxyUriRegexp.exec(requestUri);

	if (uriRegexpResult === null) {
		// const res = sendError(403, "Forbidden", "", new Error("Unable to parse URI"));
		// if (debugRequest) {
		// 	setDebugInfo(res, requestUri, undefined, signingEnabled);
		// }
		// return res;
		return sendError(403, "Forbidden", "", new Error("Unable to parse URI"));
	}

	if (uriRegexpResult[1] === undefined) {
		// const res = sendError(403, "Forbidden", "", new Error("Signature is missing from URI"));
		// if (debugRequest) {
		// 	setDebugInfo(res, requestUri, undefined, signingEnabled);
		// }
		// return res;
		return sendError(403, "Forbidden", "", new Error("Unable to parse URI"));
	}

	logLine("uri parsing successful", "info");
	logLine(`uri parsing result: ${JSON.stringify(uriRegexpResult)}`, "debug");

	const signature = uriRegexpResult[1];
	const processingOptionsString = uriRegexpResult[2] ?? "";
	const plainSourceUrl = uriRegexpResult[3];
	const encodedSourceUrl = uriRegexpResult[4];
	const format = uriRegexpResult[5];

	const sourceUrl = plainSourceUrl ?? encodedSourceUrl;

	if (sourceUrl === undefined) {
		return sendError(400, "Bad Request", "", new Error("Source URL missing"));
	}

	if (signingEnabled && !config.imgproxy_trusted_signatures.includes(signature)) {
		try {
			validateSignature(
				signature,
				IMGPROXY_SALT,
				`/${processingOptionsString}${sourceUrl}`,
				IMGPROXY_KEY,
				IMGPROXY_SIGNATURE_SIZE,
			);
		} catch (err) {
			// const res = sendError(403, "Forbidden", "", new Error("Signature is missing from URI"));
			// if (debugRequest) {
			// 	setDebugInfo(res, requestUri, undefined, signingEnabled);
			// }
			// return res;
			return sendError(403, "Forbidden", "", new Error("Signature verification failed"));
		}
	}

	logLine("normalizing options", "info");

	const optionStrings = processingOptionsString.split(PATH_SEP).map((e) => e.split(ARGS_SEP)).filter((e) =>
		e.length >= 2
	);

	if (format !== undefined) {
		optionStrings.push(["format", format]);
	}

	logLine(`option_strings: ${JSON.stringify(optionStrings)}`, "info");

	const result = [];
	const _stringify = (option: ImgproxyStdOption, args: string[]) => {
		const normalizedArgs = args.map((a) =>
			(a === "t" || a === "true")
				? "1"
				: (a === "f" || a === "false")
				? "0"
				: option.caseSensitive
				? a
				: a.toLowerCase()
		);
		return option.short + ARGS_SEP + normalizedArgs.join(ARGS_SEP);
	};
	for (let i = 0; i < optionStrings.length; i++) {
		const optionArr = optionStrings[i];
		// const option = getOption(optionArr[0].toLowerCase());
		const option = indexedOptions[optionArr[0].toLowerCase()];
		if (option !== undefined) {
			const args = optionArr.slice(1);
			if ((<ImgproxyMetaOption> option).metaOptions !== undefined) {
				const metaOptions = (<ImgproxyMetaOption> option).metaOptions;
				for (let j = 0; j < metaOptions.length; j++) {
					// const metaOption = getOption(metaOptions[j]);
					const metaOption = indexedOptions[metaOptions[j]];
					if (metaOption !== undefined) {
						if (j < args.length) {
							const metaOptionArgs = j === metaOptions.length - 1 ? args.slice(j) : [args[j]];
							result.push(_stringify(metaOption, metaOptionArgs));
						}
					}
				}
			} // expand meta-options
			else {
				result.push(_stringify(option, args));
			} // insert
		}
	}

	const normalizedOptionsString = result.length ? `/${result.join(PATH_SEP)}` : "";

	logLine("normalized parsed options", "info");
	logLine(`normalized_option_string: ${normalizedOptionsString}`, "debug");

	const newImgproxyPath = `${normalizedOptionsString}/${sourceUrl}`;
	const newSignature = signingEnabled
		? _sign(IMGPROXY_SALT, newImgproxyPath, IMGPROXY_KEY, IMGPROXY_SIGNATURE_SIZE)
		: signature;
	const resultUri = `/${newSignature}${newImgproxyPath}`;
	request.uri = resultUri;

	/**
	 * TODO: cont. implement debug response headers
	 */
	// if (debugRequest) {
	// 	setDebugInfo(request, requestUri, resultUri, signingEnabled);
	// }

	return request;
};

/**
 * K E Y  V A L U E  S T O R E
 */

async function kvsGet<K extends CloudFrontKvsFormatLabel>(
	key: string,
	handle: CloudFrontKvsHandle,
	format: K,
): Promise<Option<CloudFrontKvsFormat[K], Error>> {
	try {
		return { some: await handle.get(key, { format: format }) };
	} catch (err) {
		return { none: new Error("Failed to retrieve value from key value store") };
	}
}

/**
 * S I G N I N G
 */

function validateSignature(signature: string, salt: string, target: string, key: string, size: number) {
	if (!_stringTimingSafeEqual(signature, _sign(salt, target, key, size))) {
		throw new Error("Signature verification failed");
	}
}

function _stringTimingSafeEqual(a: string, b: string) {
	if (a.length !== b.length) {
		return false;
	}
	const _a = Buffer.from(a, "utf8");
	const _b = Buffer.from(b, "utf8");
	let xor = 0;
	for (let i = 0; i < _a.length; i++) {
		xor |= _a[i] ^ _b[i];
	}
	return 0 === xor;
}

function _sign(salt: string, target: string, key: string, size: number) {
	const hmac = crypto.createHmac("sha256", _hexDecode(key)).update(_hexDecode(salt)).update(target);
	return Buffer.from(hmac.digest().slice(0, size)).toString("base64url");
	// return crypto.createHmac("sha256", _hexDecode(key)).update(_hexDecode(salt)).update(target).digest("base64url");
}

function _hexDecode(hex: string) {
	return Buffer.from(hex, "hex");
}

/**
 * L O G G I N G
 */

function resolveLogLevel(level: LogLevel): number {
	// biome-ignore lint/complexity/useOptionalChain: <explanation>
	return (logLevelMap[level] ?? {}).index ?? Number.POSITIVE_INFINITY;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function logLine(logline: any, level: LogLevel) {
	if (resolveLogLevel(level) <= LOG_LEVEL) {
		console.log(`${logLevelMap[level].prefix} ${logline}`);
	}
}

/**
 * E R R O R
 */

function sendError(statusCode: number, statusText: string, body: string, error: Error) {
	logLine(body, "error");
	logLine(error, "error");
	const resonse: AWSCloudFrontFunction.FunctionEventResponse = {
		statusCode: statusCode,
		statusDescription: statusText,
		body: body,
		headers: {},
		cookies: {},
	};
	return resonse;
}

/**
 * D E B U G
 */

/**
 * TODO: cont. implement debug response headers
 */
// function setDebugInfo(
// 	reqres: AWSCloudFrontFunction.Request | AWSCloudFrontFunction.Response,
// 	requestUri: string,
// 	resultUri: string | undefined,
// 	signingEnabled: boolean,
// ) {
// 	reqres.headers = reqres.headers ?? {};
// 	reqres.headers["x-debug"] = {
// 		value: JSON.stringify({
// 			request_uri: requestUri,
// 			result_uri: resultUri,
// 			signing_enabled: signingEnabled,
// 		}),
// 	};
// }
