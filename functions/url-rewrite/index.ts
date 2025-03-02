/**
 * TODO:
 * [x] change to ESM import statements
 * [x] use JSON kvs value for configuration
 * [ ] inline extraneous functions
 * [ ] test/streamline code for aws-js2.0
 * [x] handle multiple `preset` options
 */

// @ts-ignore: CloudFront Function runtime import
// biome-ignore lint/style/useNodejsImportProtocol:
import crypto from "crypto";
// @ts-ignore: CloudFront Function runtime import
import cf from "cloudfront";

import type { ImgproxyMetaOption, ImgproxyOption } from "../../scripts/functions/url-rewrite/processing-options";

/**
 * D A T A
 */

const indexedOptions: Record<string, ImgproxyOption> = {
	resize: { full: "resize", short: "rs", meta: true, metaOptions: ["resizing_type", "width", "height", "enlarge", "extend"] },
	rs: { full: "resize", short: "rs", meta: true, metaOptions: ["resizing_type", "width", "height", "enlarge", "extend"] },
	size: { full: "size", short: "s", meta: true, metaOptions: ["width", "height", "enlarge", "extend"] },
	s: { full: "size", short: "s", meta: true, metaOptions: ["width", "height", "enlarge", "extend"] },
	resizing_type: { full: "resizing_type", short: "rt" },
	rt: { full: "resizing_type", short: "rt" },
	width: { full: "width", short: "w" },
	w: { full: "width", short: "w" },
	height: { full: "height", short: "h" },
	h: { full: "height", short: "h" },
	min_width: { full: "min_width", short: "mw" },
	mw: { full: "min_width", short: "mw" },
	min_height: { full: "min_height", short: "mh" },
	mh: { full: "min_height", short: "mh" },
	zoom: { full: "zoom", short: "z" },
	z: { full: "zoom", short: "z" },
	dpr: { full: "dpr", short: "dpr" },
	enlarge: { full: "enlarge", short: "el" },
	el: { full: "enlarge", short: "el" },
	extend: { full: "extend", short: "ex" },
	ex: { full: "extend", short: "ex" },
	extend_aspect_ratio: { full: "extend_aspect_ratio", short: "exar", alt: "extend_ar" },
	exar: { full: "extend_aspect_ratio", short: "exar", alt: "extend_ar" },
	extend_ar: { full: "extend_aspect_ratio", short: "exar", alt: "extend_ar" },
	gravity: { full: "gravity", short: "g" },
	g: { full: "gravity", short: "g" },
	crop: { full: "crop", short: "c" },
	c: { full: "crop", short: "c" },
	trim: { full: "trim", short: "t" },
	t: { full: "trim", short: "t" },
	padding: { full: "padding", short: "pd" },
	pd: { full: "padding", short: "pd" },
	auto_rotate: { full: "auto_rotate", short: "ar" },
	ar: { full: "auto_rotate", short: "ar" },
	rotate: { full: "rotate", short: "rot" },
	rot: { full: "rotate", short: "rot" },
	background: { full: "background", short: "bg" },
	bg: { full: "background", short: "bg" },
	blur: { full: "blur", short: "bl" },
	bl: { full: "blur", short: "bl" },
	sharpen: { full: "sharpen", short: "sh" },
	sh: { full: "sharpen", short: "sh" },
	pixelate: { full: "pixelate", short: "pix" },
	pix: { full: "pixelate", short: "pix" },
	watermark: { full: "watermark", short: "wm" },
	wm: { full: "watermark", short: "wm" },
	strip_metadata: { full: "strip_metadata", short: "sm" },
	sm: { full: "strip_metadata", short: "sm" },
	keep_copyright: { full: "keep_copyright", short: "kcr" },
	kcr: { full: "keep_copyright", short: "kcr" },
	strip_color_profile: { full: "strip_color_profile", short: "scp" },
	scp: { full: "strip_color_profile", short: "scp" },
	enforce_thumbnail: { full: "enforce_thumbnail", short: "eth" },
	eth: { full: "enforce_thumbnail", short: "eth" },
	quality: { full: "quality", short: "q" },
	q: { full: "quality", short: "q" },
	format_quality: { full: "format_quality", short: "fq" },
	fq: { full: "format_quality", short: "fq" },
	max_bytes: { full: "max_bytes", short: "mb" },
	mb: { full: "max_bytes", short: "mb" },
	format: { full: "format", short: "f", alt: "ext" },
	f: { full: "format", short: "f", alt: "ext" },
	ext: { full: "format", short: "f", alt: "ext" },
	skip_processing: { full: "skip_processing", short: "skp" },
	skp: { full: "skip_processing", short: "skp" },
	raw: { full: "raw", short: "raw" },
	cache_buster: { full: "cache_buster", short: "cb" },
	cb: { full: "cache_buster", short: "cb" },
	expires: { full: "expires", short: "exp" },
	exp: { full: "expires", short: "exp" },
	filename: { full: "filename", short: "fn" },
	fn: { full: "filename", short: "fn" },
	return_attachment: { full: "return_attachment", short: "att" },
	att: { full: "return_attachment", short: "att" },
	preset: { full: "preset", short: "pr" },
	pr: { full: "preset", short: "pr" },
	max_src_resolution: { full: "max_src_resolution", short: "msr" },
	msr: { full: "max_src_resolution", short: "msr" },
	max_src_file_size: { full: "max_src_file_size", short: "msfs" },
	msfs: { full: "max_src_file_size", short: "msfs" },
	max_animation_frames: { full: "max_animation_frames", short: "maf" },
	maf: { full: "max_animation_frames", short: "maf" },
	max_animation_frame_resolution: { full: "max_animation_frame_resolution", short: "mafr" },
	mafr: { full: "max_animation_frame_resolution", short: "mafr" },
};

const optionPriority = [
	"rs",
	"s",
	"rt",
	"w",
	"h",
	"mw",
	"mh",
	"z",
	"dpr",
	"el",
	"ex",
	"exar",
	"g",
	"c",
	"t",
	"pd",
	"ar",
	"rot",
	"bg",
	"bl",
	"sh",
	"pix",
	"wm",
	"sm",
	"kcr",
	"scp",
	"eth",
	"q",
	"fq",
	"mb",
	"f",
	"skp",
	"raw",
	"cb",
	"exp",
	"fn",
	"att",
	"pr",
	"msr",
	"msfs",
	"maf",
	"mafr",
];

function optionPriorityOrder(a: string[], b: string[]) {
	return optionPriority.indexOf(a[0]) - optionPriority.indexOf(b[0]);
}

const logLevelMap: Record<UrlRewrite.LogLevel, { prefix: string; index: number; }> = {
	none: { prefix: "", index: 0 },
	error: { prefix: "[ERROR]", index: 1 },
	warn: { prefix: "[WARN]", index: 2 },
	info: { prefix: "[INFO]", index: 3 },
	debug: { prefix: "[DEBUG]", index: 4 },
};

/**
 * G L O B A L S
 */

const kvsHandle = cf.kvs();
const defaultConfig: UrlRewrite.Config = {
	imgproxy_salt: "",
	imgproxy_key: "",
	imgproxy_signature_size: 32,
	imgproxy_trusted_signatures: [],
	imgproxy_arguments_separator: ":",
	log_level: "none",
};

let LOG_LEVEL = resolveLogLevel("none");

/**
 * H A N D L E R
 */

async function handler(event: AWSCloudFrontFunction.Event) {
	// logLine(`In handler with event: ${JSON.stringify(event)}`, "debug");

	const kvsResponse = await kvsGet("config", kvsHandle, "json");

	if (kvsResponse.none !== undefined) {
		return sendError(403, "Forbidden", "", kvsResponse.none);
	}

	logLine("Config fetched from kvs", "info");

	const config = Object.assign(defaultConfig, kvsResponse.some as UrlRewrite.Config);

	LOG_LEVEL = resolveLogLevel(config.log_level);

	const IMGPROXY_ARGUMENTS_SEPARATOR = config.imgproxy_arguments_separator;
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

	// logLine(`Source: ${request.headers.host.value}${request.uri}`, "debug");
	// logLine("parsing uri", "info");

	const imgproxyUriRegexp = new RegExp(
		`^\\/([^\\/]+)\\/((?:[a-z]+\\${IMGPROXY_ARGUMENTS_SEPARATOR}[^\\/]+\\/)+)?(plain\\/|enc\\/)?(.+)`,
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
	// logLine(`uri parsing result: ${JSON.stringify(uriRegexpResult)}`, "debug");

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
			const res = sendError(403, "Forbidden", "", new Error("Signature verification failed"));
		}
	}

	const optionStrings = trimSeparators(processingOptionsString).split("/");
	const normalizedOptionMap: Record<string, [number, [string, string]]> = {};
	let mapOrder = 0;
	let presetCount = 0;
	logLine("mapping processing options", "info");
	for (let i = 0; i < optionStrings.length; i++) {
		const optionArr = optionStrings[i].split(IMGPROXY_ARGUMENTS_SEPARATOR);
		const option = optionArr.shift();
		const args = optionArr;
		if (option !== undefined && args.length > 0) {
			const optionMap = indexedOptions[option];
			if (optionMap !== undefined) {
				if ((optionMap as ImgproxyMetaOption).meta) {
					const metaOptions = (optionMap as ImgproxyMetaOption).metaOptions;
					for (let j = 0; j < metaOptions.length; j++) {
						const metaOption = metaOptions[j];
						if (args[j] !== undefined) {
							const individualOptionArgs = j === metaOptions.length - 1 ? args.slice(j) : [args[j]];
							const metaOptionMap = indexedOptions[metaOption];
							if (metaOptionMap !== undefined) {
								const preferredKey = metaOptionMap.short ?? metaOption;
								normalizedOptionMap[preferredKey] = [mapOrder++, [
									preferredKey,
									preferredKey + IMGPROXY_ARGUMENTS_SEPARATOR + individualOptionArgs.join(IMGPROXY_ARGUMENTS_SEPARATOR),
								]];
							}
						}
					}
				} else {
					const preferredKey = optionMap.short ?? option;
					normalizedOptionMap[`${preferredKey}${preferredKey === "pr" ? presetCount++ : ""}`] = [mapOrder++, [
						preferredKey,
						preferredKey + IMGPROXY_ARGUMENTS_SEPARATOR + args.join(IMGPROXY_ARGUMENTS_SEPARATOR),
					]];
				}
			}
		}
	}
	// logLine(`option_partitions: ${JSON.stringify(normalizedOptionMap)}`, "debug");

	logLine("normalizing options map", "info");
	const optionEntries = Object.values(normalizedOptionMap).sort((a, b) => a[0] - b[0]).map((v) => v[1]);

	// logLine(`option_entries: ${JSON.stringify(optionEntries)}`, "debug");

	const partitionedStrings: string[] = [];
	let temp: [string, string][] = [];
	for (let i = 0; i < optionEntries.length; i++) {
		const entry = optionEntries[i];
		if (entry[0] === "pr") {
			temp.sort(optionPriorityOrder).push(entry);
			partitionedStrings.push(temp.map((e) => e[1]).join("/"));
			temp = [];
		} else {
			temp.push(entry);
		}
	}
	// handle trailing partition
	if (temp.length) {
		partitionedStrings.push(temp.sort(optionPriorityOrder).map((e) => e[1]).join("/"));
	}

	const normalizedOptionsString = partitionedStrings.join("/");

	logLine("options_map normalized", "info");
	// logLine(`normalized_option_string: ${normalizedOptionsString}`, "debug");

	const newImgproxyPath = `/${normalizedOptionsString}/${sourceUrlType}${sourceUrl}`;
	const resultUri = `/${_sign(IMGPROXY_SALT, newImgproxyPath, IMGPROXY_KEY, IMGPROXY_SIGNATURE_SIZE)}${newImgproxyPath}`;
	request.uri = resultUri;

	/**
	 * TODO: cont. implement debug response headers
	 */
	// if (debugRequest) {
	// 	setDebugInfo(request, requestUri, resultUri, signingEnabled);
	// }
	return request;
}

/**
 * K E Y  V A L U E  S T O R E
 */

async function kvsGet<K extends keyof KeyValueStore.ValueFormat>(
	key: string,
	handle: KeyValueStore.Handle,
	format: K,
): Promise<Option<KeyValueStore.ValueFormat[K], Error>> {
	try {
		return { some: await handle.get(`${key}`, { format: format }) };
	} catch (err) {
		return { none: new Error("Failed to retrieve value from key value store") };
	}
}

/**
 * U T I L I T Y
 */

function trimSeparators(str: string) {
	return str.replaceAll(/^\/|\/$/g, "");
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

function resolveLogLevel(level: UrlRewrite.LogLevel): number {
	// biome-ignore lint/complexity/useOptionalChain: <explanation>
	return (logLevelMap[level] ?? {}).index ?? Number.POSITIVE_INFINITY;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function logLine(logline: any, level: UrlRewrite.LogLevel) {
	if (resolveLogLevel(level) <= LOG_LEVEL) {
		console.log(`${logLevelMap[level].prefix}${logline}`);
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
	return { statusCode, statusText, body } as AWSCloudFrontFunction.Response;
}

/**
 * T Y P E S
 */

type Option<T, E> = { some: T; none?: undefined; } | { some?: undefined; none: E; };

namespace KeyValueStore {
	export type ValueFormat = { string: string; json: Record<string, unknown>; bytes: Buffer; };

	export type Handle = {
		get: <K extends keyof ValueFormat>(key: string, options: { format: K; }) => Promise<ValueFormat[K]> | never;
		exists: (key: string) => Promise<boolean>;
		meta: () => Promise<MetaDataResponse>;
	};

	export type MetaDataResponse = {
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

namespace UrlRewrite {
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
