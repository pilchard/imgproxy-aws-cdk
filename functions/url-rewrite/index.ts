/**
 * TODO:
 * [ ] inline extraneous functions
 * [ ] test/streamline code for aws-js2.0
 */

// @ts-ignore: CloudFront Function runtime import
// biome-ignore lint/style/useNodejsImportProtocol:
import crypto from "crypto";

import cf from "cloudfront";

import type { AWSCloudFront } from "cloudfront";
import type { ImgproxyMetaOption, ImgproxyOption } from "./imgproxy-option-data.ts";
import type { UrlRewrite } from "./url-rewrite.d.ts";
import type { Option } from "./utility.d.ts";

/**
 * D A T A
 */

const imgproxyProcessingOptions: ImgproxyOption[] = [
	{ full: "resize", short: "rs", meta: true, metaOptions: ["resizing_type", "width", "height", "enlarge", "extend"] },
	{ full: "size", short: "s", meta: true, metaOptions: ["width", "height", "enlarge", "extend"] },
	{ full: "resizing_type", short: "rt" },
	{ full: "resizing_algorithm", short: "ra", pro: true },
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
	{ full: "objcts_position", short: "op", alt: "obj_pos", pro: true },
	{ full: "crop", short: "c" },
	{ full: "trim", short: "t" },
	{ full: "padding", short: "pd" },
	{ full: "auto_rotate", short: "ar" },
	{ full: "rotate", short: "rot" },
	{ full: "background", short: "bg" },
	{ full: "background_alpha", short: "bga", pro: true },
	{ full: "adjust", short: "a", pro: true, meta: true, metaOptions: ["brightness", "contrast", "saturation"] },
	{ full: "brightness", short: "br", pro: true },
	{ full: "contrast", short: "co", pro: true },
	{ full: "saturation", short: "sa", pro: true },
	{ full: "monochrome", short: "mc", pro: true },
	{ full: "duotone", short: "dt", pro: true },
	{ full: "blur", short: "bl" },
	{ full: "sharpen", short: "sh" },
	{ full: "pixelate", short: "pix" },
	{ full: "unsharp_masking", short: "ush", pro: true },
	{ full: "blur_detections", short: "bd", pro: true },
	{ full: "draw_detections", short: "dd", pro: true },
	{ full: "colorize", short: "col", pro: true },
	{ full: "gradient", short: "gr", pro: true },
	{ full: "watermark", short: "wm" },
	{ full: "watermark_url", short: "wmu", pro: true },
	{ full: "watermark_text", short: "wmt", pro: true },
	{ full: "watermark_size", short: "wms", pro: true },
	{ full: "watermark_rotate", short: "wmr", alt: "wm_rot", pro: true },
	{ full: "watermark_shadow", short: "wmsh", pro: true },
	{ full: "style", short: "st", pro: true },
	{ full: "strip_metadata", short: "sm" },
	{ full: "keep_copyright", short: "kcr" },
	{ full: "dpi", short: "dpi", pro: true },
	{ full: "strip_color_profile", short: "scp" },
	{ full: "enforce_thumbnail", short: "eth" },
	{ full: "quality", short: "q" },
	{ full: "format_quality", short: "fq" },
	{ full: "autoquality", short: "aq", pro: true },
	{ full: "max_bytes", short: "mb" },
	{ full: "jpeg_options", short: "jpgo", pro: true },
	{ full: "png_options", short: "pngo", pro: true },
	{ full: "webp_options", short: "webpo", pro: true },
	{ full: "format", short: "f", alt: "ext" },
	{ full: "page", short: "pg", pro: true },
	{ full: "pages", short: "pgs", pro: true },
	{ full: "disable_animation", short: "da", pro: true },
	{ full: "video_thumbnail_second", short: "vts", pro: true },
	{ full: "video_thumbnail_keyframes", short: "vtk", pro: true },
	{ full: "video_thumbnail_tile", short: "vtt", pro: true },
	{ full: "video_thumbnail_animation", short: "vta", pro: true },
	{ full: "fallback_image_url", short: "fiu", pro: true },
	{ full: "skip_processing", short: "skp" },
	{ full: "raw", short: "raw" },
	{ full: "cache_buster", short: "cb" },
	{ full: "expires", short: "exp" },
	{ full: "filename", short: "fn" },
	{ full: "return_attachment", short: "att" },
	{ full: "preset", short: "pr" },
	{ full: "hashsum", short: "hs", pro: true },
	{ full: "max_src_resolution", short: "msr" },
	{ full: "max_src_file_size", short: "msfs" },
	{ full: "max_animation_frames", short: "maf" },
	{ full: "max_animation_frame_resolution", short: "mafr" },
];

const getOption = (label: string) =>
	imgproxyProcessingOptions.find((option) => option.full === label || option.short === label || option.alt === label);

const optionPriority = imgproxyProcessingOptions.map((o) => o.short);

function optionPriorityOrder(a: [string, string], b: [string, string]) {
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
let ARGS_SEP = defaultConfig.imgproxy_arguments_separator;
const PATH_SEP = "/";

/**
 * H A N D L E R
 */

export async function handler(event: AWSCloudFrontFunction.Event): Promise<AWSCloudFrontFunction.Request | AWSCloudFrontFunction.Response> {
	// logLine(`In handler with event: ${JSON.stringify(event)}`, "debug");

	const kvsResponse = await kvsGet("config", kvsHandle, "json");

	if (kvsResponse.none !== undefined) {
		return sendError(403, "Forbidden", "", kvsResponse.none);
	}

	logLine("Config fetched from kvs", "info");

	const config = Object.assign(defaultConfig, kvsResponse.some as UrlRewrite.Config);

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

	// logLine(`Source: ${request.headers.host.value}${request.uri}`, "debug");
	// logLine("parsing uri", "info");

	const imgproxyUriRegexp = new RegExp(`^\\/([^\\/]+)\\/((?:[a-z]+\\${ARGS_SEP}[^\\/]+\\/)+)?(plain\\/|enc\\/)?(.+)`, "g");

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
			return sendError(403, "Forbidden", "", new Error("Signature verification failed"));
		}
	}

	logLine("normalizing options", "info");

	const optionStrings = processingOptionsString.split(PATH_SEP).map((e) => e.split(ARGS_SEP)).filter((e) => e.length >= 2);

	logLine(`option_strings: ${JSON.stringify(optionStrings)}`, "info");

	const partitionedOptionStrings: string[] = [];
	const seen: Record<string, number> = {};
	let partition: [string, string][] = [];
	const stringify = () => partition.sort(optionPriorityOrder).map((e) => e[1]).join(PATH_SEP);
	const optionTuple = (opt: string, args: string[]): [string, string] => [opt, opt + ARGS_SEP + args.join(ARGS_SEP)];
	for (let i = optionStrings.length - 1; i >= 0; i--) {
		const optionArr = optionStrings[i];

		// const option = indexedOptions[optionArr[0]];
		const option = getOption(optionArr[0]);
		const args = optionArr.slice(1);
		if (option !== undefined) {
			// expand meta options
			if ((option as ImgproxyMetaOption).meta !== undefined && (option as ImgproxyMetaOption).meta) {
				const metaOptions = (option as ImgproxyMetaOption).metaOptions;
				for (let j = 0; j < metaOptions.length; j++) {
					// const metaOption = indexedOptions[metaOptions[j]];
					const metaOption = getOption(metaOptions[j]);
					if (metaOption !== undefined) {
						if (j < args.length) {
							const metaOptionArgs = j === metaOptions.length - 1 ? args.slice(j) : [args[j]];
							const metaOptKey = metaOption.short;
							if (!{}.hasOwnProperty.call(seen, metaOptKey)) {
								partition.push(optionTuple(metaOptKey, metaOptionArgs));
							}
						}
					}
				}
			} else {
				const opt = option.short;

				// partition if preset
				if (opt === "pr") {
					if (partition.length) {
						partitionedOptionStrings.push(stringify());
						partition = [];
					}

					// accumulate consecutive 'pr' options. ie. `pr:wide/pr:tall` -> `pr:wide:tall`
					while (optionStrings[i - 1][0] === "pr" || optionStrings[i - 1][0] === "preset") {
						args.push.apply(args, optionStrings[i - 1].slice(1));
						i--;
					}

					// push preset
					partitionedOptionStrings.push(optionTuple(opt, args)[1]);
				} else if (!{}.hasOwnProperty.call(seen, opt)) {
					// handle standard option
					partition.push(optionTuple(opt, args));
					seen[opt] = 1;
				}
			}
		}
		// handle trailing partition
		if (i === 0 && partition.length) {
			partitionedOptionStrings.push(stringify());
		}
	}

	const normalizedOptionsString = partitionedOptionStrings.reverse().join(PATH_SEP);

	logLine("normalized parsed options", "info");
	logLine(`normalized_option_string: ${normalizedOptionsString}`, "debug");

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

async function kvsGet<K extends AWSCloudFront.ValueFormatLabel>(
	key: string,
	handle: AWSCloudFront.Handle,
	format: K,
): Promise<Option<AWSCloudFront.ValueFormat<K>, Error>> {
	try {
		return { some: await handle.get(`${key}`, { format: format }) };
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
