// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
import crypto from "crypto";
import cf from "cloudfront";

// set to true to enable console logging
const loggingEnabled = false;
// set to true to include imgproxy Pro processing options
const enableProOptions = false;

// Remember to associate the KVS with your function before accessing KVS keys.
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions-associate.html
const imgproxyKey = "imgproxy.prod.key";
const imgproxySalt = "imgproxy.prod.salt";
const imgproxyArgumentsSeparotor = "imgproxy.prod.arguments_separator";

// biome-ignore lint/complexity/useArrowFunction: <explanation>
const indexedOptions = (function (arr) {
	const result = Object.create(null);
	for (const option of arr) {
		if (!enableProOptions && option.pro) {
			continue;
		}
		for (const key of ["full", "short", "alt"]) {
			const indexKey = option[key];
			if (indexKey !== undefined) {
				result[indexKey] = option;
			}
		}
	}
	return result;
})([
	{
		full: "resize",
		short: "rs",
		meta: true,
		metaOptions: ["resizing_type", "width", "height", "enlarge", "extend"],
	},
	{
		full: "size",
		short: "s",
		meta: true,
		metaOptions: ["width", "height", "enlarge", "extend"],
	},
	{
		full: "resizing_type",
		short: "rt",
		types: ["fit", "fill", "fill-down", "force", "auto"],
	},
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
	{
		full: "adjust",
		short: "a",
		pro: true,
		meta: true,
		metaOptions: ["brightness", "contrast", "saturation"],
	},
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
]);

// Signature Validation
function validate_signature(salt, target, key, signature) {
	if (!_verify(salt, target, key, signature)) {
		throw new Error("Signature verification failed");
	}
}

function _stringTimingSafeEqual(a, b) {
	if (a.length !== b.length) {
		return false;
	}
	return crypto.timingSafeEqual(Buffer.from(a, "utf16le"), Buffer.from(b, "utf16le"));
}

function _verify(salt, target, key, signature) {
	return _stringTimingSafeEqual(signature, _sign(salt, target, key));
}

function _sign(salt, target, key) {
	const hmac = crypto.createHmac("sha256", _hexDecode(key));
	hmac.update(_hexDecode(salt));
	hmac.update(target);
	return hmac.digest("base64url");
}

function _hexDecode(hex) {
	return Buffer.from(hex, "hex");
}

function _trimSeparators(urlStr) {
	return urlStr.replaceAll(/^\/|\/$/g, "");
}

// Handler
async function handler(event) {
	const request = event.request;

	const envVariables = await getEnvironmentVariables();

	// return 403 on failure to retreive environment variables.
	if (envVariables === null) {
		return sendError(403, "Forbidden", "", "Environment variable fetching failed.");
	}

	const IMGPROXY_SALT = envVariables.IMGPROXY_SALT;
	const IMGPROXY_KEY = envVariables.IMGPROXY_KEY;
	const IMGPROXY_ARGUMENTS_SEPARATOR = envVariables.IMGPROXY_ARGUMENTS_SEPARATOR;

	const imgproxyUriRegexp = new RegExp(
		`^\\/([^\\/]+)\\/((?:[a-z]+\\${IMGPROXY_ARGUMENTS_SEPARATOR}[^\\/]+\\/)+)?(plain\\/|enc\\/)?(.+)`,
		"g",
	);

	const uriRegexpResult = imgproxyUriRegexp.exec(request.uri);

	// return 403 if URI parsing fails.
	if (uriRegexpResult === null) {
		return sendError(403, "Forbidden", "", "Unable to parse URI.");
	}

	// return 403 if signature is undefined.
	if (uriRegexpResult[1] === undefined) {
		return sendError(403, "Forbidden", "", "Signature is missing from URI.");
	}

	const signature = uriRegexpResult[1];
	const processingOptionsString = uriRegexpResult[2] !== undefined ? uriRegexpResult[2] : "";
	const sourceUrlType = uriRegexpResult[3] !== undefined ? uriRegexpResult[3] : "";
	const sourceUrl = uriRegexpResult[4] !== undefined ? uriRegexpResult[4] : "";

	try {
		validate_signature(
			IMGPROXY_SALT,
			`/${processingOptionsString}${sourceUrlType}${sourceUrl}`,
			IMGPROXY_KEY,
			signature,
		);
	} catch (e) {
		return sendError(403, "Forbidden", "", "Signature verification failed.");
	}

	const processingOptionsMap = new Map();
	for (const optionString of _trimSeparators(processingOptionsString).split("/")) {
		const optionArr = optionString.split(IMGPROXY_ARGUMENTS_SEPARATOR);
		const option = optionArr.shift();
		const args = optionArr;
		if (option !== undefined && args.length > 0) {
			const optionMap = indexedOptions[option];
			if (optionMap !== undefined) {
				if (optionMap.meta) {
					const metaOptions = optionMap.metaOptions;
					for (let metaOptionIndex = 0; metaOptionIndex < metaOptions.length; metaOptionIndex++) {
						const metaOption = metaOptions[metaOptionIndex];

						if (args[metaOptionIndex] !== undefined) {
							const individualOptionArgs =
								metaOptionIndex === metaOptions.length - 1
									? args.slice(metaOptionIndex)
									: [args[metaOptionIndex]];

							const metaOptionMap = indexedOptions[metaOption];
							if (metaOptionMap !== undefined) {
								const preferredKey =
									metaOptionMap.short !== undefined ? metaOptionMap.short : option;
								processingOptionsMap.delete(preferredKey);
								processingOptionsMap.set(
									preferredKey,
									individualOptionArgs.join(IMGPROXY_ARGUMENTS_SEPARATOR),
								);
							}
						}
					}
				} else {
					const preferredKey = optionMap.short !== undefined ? optionMap.short : option;
					processingOptionsMap.delete(preferredKey);
					processingOptionsMap.set(preferredKey, args.join(IMGPROXY_ARGUMENTS_SEPARATOR));
				}
			}
		}
	}

	const normalizedOptionsArr = [];
	for (const entry of processingOptionsMap.entries()) {
		normalizedOptionsArr.push(entry.join(IMGPROXY_ARGUMENTS_SEPARATOR));
	}
	const normalizedOptionsString = normalizedOptionsArr.join("/");

	const newImgproxyPath = `/${normalizedOptionsString}/${sourceUrlType}${sourceUrl}`;
	const newUri = `/${_sign(IMGPROXY_SALT, newImgproxyPath, IMGPROXY_KEY)}${newImgproxyPath}`;

	request.uri = newUri;
	return request;
}

// get environment variables from key value store
async function getEnvironmentVariables() {
	const kvsHandle = cf.kvs();

	let IMGPROXY_SALT;
	try {
		IMGPROXY_SALT = await kvsHandle.get(imgproxySalt, { format: "string" });
	} catch (err) {
		log(`Error reading value for key: ${imgproxySalt}, error: ${err}`);
		return null;
	}
	let IMGPROXY_KEY;
	try {
		IMGPROXY_KEY = await kvsHandle.get(imgproxyKey, { format: "string" });
	} catch (err) {
		log(`Error reading value for key: ${imgproxyKey}, error: ${err}`);
		return null;
	}
	let IMGPROXY_ARGUMENTS_SEPARATOR;
	try {
		IMGPROXY_ARGUMENTS_SEPARATOR = await kvsHandle.get(imgproxyArgumentsSeparotor, {
			format: "string",
		});
	} catch (err) {
		log(`Error reading value for key: ${imgproxyArgumentsSeparotory}, error: ${err}`);
		return null;
	}

	return {
		IMGPROXY_SALT: IMGPROXY_SALT,
		IMGPROXY_KEY: IMGPROXY_KEY,
		IMGPROXY_ARGUMENTS_SEPARATOR: IMGPROXY_ARGUMENTS_SEPARATOR,
	};
}

function log(message) {
	if (loggingEnabled) {
		console.log(message);
	}
}

function sendError(statusCode, statusText, body, error) {
	logError(statusText, body, error);
	return { statusCode, statusText, body };
}

function logError(body, error) {
	console.log("APPLICATION ERROR", body);
	console.log(error);
}
