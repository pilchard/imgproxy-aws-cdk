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
import type { ImgproxyMetaOption, ImgproxyOption } from "./imgproxy-option-data.ts";

export type MergeAction = "overwrite" | "merge" | "concat" | "concat_global";
export type MergeOptions = { action: MergeAction; gravityOffset?: number; };
export type Partition = {
	_result: string[];
	_seen: Record<string, number>;
	_current: OptionPartition;
	_cumulative: OptionPartition;
	result: string[];
	insert: (option: ImgproxyOption, args: string[]) => void;
	commit: (partition: OptionPartition) => void;
	cycle: () => void;
	end: () => void;
	_stringify: (partition: OptionPartition) => string;
	_normalize: (optKey: string, args: string[]) => string[];
};
export type OptionPartition = Record<string, string[]>;
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
	{ full: "extend", short: "ex", merge: { action: "merge", gravityOffset: 1 } },
	{ full: "extend_aspect_ratio", short: "exar", alt: "extend_ar", merge: { action: "merge", gravityOffset: 1 } },
	{ full: "gravity", short: "g", merge: { action: "merge", gravityOffset: 0 } },
	{ full: "crop", short: "c", merge: { action: "merge", gravityOffset: 2 } },
	{ full: "trim", short: "t", merge: "merge" },
	{ full: "padding", short: "pd", merge: "merge" },
	{ full: "auto_rotate", short: "ar" },
	{ full: "rotate", short: "rot" },
	{ full: "background", short: "bg" },
	{ full: "blur", short: "bl" },
	{ full: "sharpen", short: "sh" },
	{ full: "pixelate", short: "pix" },
	{ full: "watermark", short: "wm", merge: "merge" },
	{ full: "strip_metadata", short: "sm" },
	{ full: "keep_copyright", short: "kcr" },
	{ full: "strip_color_profile", short: "scp" },
	{ full: "enforce_thumbnail", short: "eth" },
	{ full: "quality", short: "q" },
	{ full: "format_quality", short: "fq", merge: "concat_global" },
	{ full: "max_bytes", short: "mb" },
	{ full: "format", short: "f", alt: "ext" },
	{ full: "skip_processing", short: "skp", merge: "concat_global" },
	{ full: "raw", short: "raw" },
	{ full: "cache_buster", short: "cb" },
	{ full: "expires", short: "exp" },
	{ full: "filename", short: "fn" },
	{ full: "return_attachment", short: "att" },
	{ full: "preset", short: "pr", merge: "concat" },
	{ full: "max_src_resolution", short: "msr" },
	{ full: "max_src_file_size", short: "msfs" },
	{ full: "max_animation_frames", short: "maf" },
	{ full: "max_animation_frame_resolution", short: "mafr" },
];

const caseSensitiveOptions = ["fn"];

const getOption = (label: string) =>
	imgproxyProcessingOptions.find((option) => option.full === label || option.short === label || option.alt === label);

const optionPriority = imgproxyProcessingOptions.map((o) => o.short);

function optionPriorityOrder(a: [string, string[]], b: [string, string[]]) {
	return optionPriority.indexOf(a[0]) - optionPriority.indexOf(b[0]);
}

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
		`^\\/([^\\/]+)\\/((?:[a-zA-Z_]+\\${ARGS_SEP}[^\\/]+\\/)+)?(plain\\/|enc\\/)?(.+)`,
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
	const sourceUrlType = uriRegexpResult[3] ?? "";
	const sourceUrl = uriRegexpResult[4] ?? "";

	if (signingEnabled && !config.imgproxy_trusted_signatures.includes(signature)) {
		try {
			validateSignature(
				signature,
				IMGPROXY_SALT,
				`/${processingOptionsString}${sourceUrlType}${sourceUrl}`,
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

	logLine(`option_strings: ${JSON.stringify(optionStrings)}`, "info");

	const partition: Partition = createPartition(optionPriorityOrder);
	for (let i = optionStrings.length - 1; i >= 0; i--) {
		const optionArr = optionStrings[i];
		const option = getOption(optionArr[0].toLowerCase());
		if (option !== undefined) {
			const args = optionArr.slice(1);
			if ((<ImgproxyMetaOption> option).metaOptions !== undefined) {
				const metaOptions = (<ImgproxyMetaOption> option).metaOptions;
				for (let j = 0; j < metaOptions.length; j++) {
					const metaOption = getOption(metaOptions[j]);
					if (metaOption !== undefined) {
						if (j < args.length) {
							const metaOptionArgs = j === metaOptions.length - 1 ? args.slice(j) : [args[j]];
							partition.insert(metaOption, metaOptionArgs);
						}
					}
				}
			} else {
				if (option.short === "pr") {
					partition.cycle();
					while (i > 0 && (optionStrings[i - 1][0] === "pr" || optionStrings[i - 1][0] === "preset")) {
						args.unshift.apply(args, optionStrings[i - 1].slice(1));
						i--;
					}
					partition.commit({ pr: args });
				} else {
					partition.insert(option, args);
				}
			}
		}
		if (i === 0) {
			partition.end();
		}
	}

	const normalizedOptionsString = partition.result.reverse().join(PATH_SEP);

	logLine("normalized parsed options", "info");
	logLine(`normalized_option_string: ${normalizedOptionsString}`, "debug");

	const newImgproxyPath = `/${normalizedOptionsString}/${sourceUrlType}${sourceUrl}`;
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
 * P A R T I T I O N
 */
function createPartition(sortOrder: (a: [string, string[]], b: [string, string[]]) => number): Partition {
	return {
		_result: [],
		_current: {},
		_cumulative: {},
		_seen: {},
		get result() {
			return this._result;
		},
		_normalize(optKey, args) {
			return args.map((a) =>
				(a === "t" || a === "true")
					? "1"
					: (a === "f" || a === "false")
					? "0"
					: caseSensitiveOptions.includes(optKey)
					? a
					: a.toLowerCase()
			);
		},
		_stringify(partition) {
			return Object.entries(partition).sort(sortOrder).map((e) =>
				e[0] + ARGS_SEP + this._normalize(e[0], e[1]).join(ARGS_SEP)
			).join(PATH_SEP);
		},
		commit(partition) {
			if (Object.entries(partition).length) {
				this._result.push(this._stringify(partition));
			}
		},
		end() {
			this.commit(this._current);
			this.commit(this._cumulative);
			this._current = {};
			this._cumulative = {};
		},
		cycle() {
			this.commit(this._current);
			this._current = {};
		},
		insert(option, args) {
			const optionKey = option.short;

			const mergeOptions: MergeOptions = option.merge === undefined
				? { action: "overwrite" }
				: (typeof option.merge === "string")
				? { action: option.merge }
				: option.merge;

			switch (mergeOptions.action) {
				case "overwrite": {
					if (!{}.hasOwnProperty.call(this._seen, optionKey)) {
						this._current[optionKey] = args;
						this._seen[optionKey] = 1;
					}
					break;
				}
				case "concat": {
					this._current[optionKey] = args.concat(this._current[optionKey] || []);
					break;
				}
				case "concat_global": {
					this._cumulative[optionKey] = args.concat(this._cumulative[optionKey] || []);
					break;
				}
				case "merge": {
					const current = this._current[optionKey];
					if (
						current === undefined
						|| (mergeOptions.gravityOffset !== undefined
							&& (args[mergeOptions.gravityOffset] === "sm" || args[mergeOptions.gravityOffset] === "fp"))
					) {
						this._current[optionKey] = args;
						break;
					}

					for (let i = 0; i < args.length; i++) {
						if (current[i] === "" || current[i] === undefined) {
							current[i] = args[i];
						}
					}
					break;
				}
			}
		},
	};
}

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
