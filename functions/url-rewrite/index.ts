// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
const crypto = require("crypto");
const cf = require("cloudfront");

import type { ImgproxyBaseOption, ImgproxyMetaOption, ImgproxyOption } from "./processing-options";

type Option<T, E> =
	| {
			some: T;
			none?: undefined;
	  }
	| {
			some?: undefined;
			none: E;
	  };

const imgproxyKey = "dev.key";
const imgproxySalt = "dev.salt";
const imgproxyArgumentsSeparotor = "dev.arguments_separator";

const indexedOptions: Record<string, ImgproxyOption> = {
	resize: {
		full: "resize",
		short: "rs",
		meta: true,
		metaOptions: ["resizing_type", "width", "height", "enlarge", "extend"],
	},
	rs: {
		full: "resize",
		short: "rs",
		meta: true,
		metaOptions: ["resizing_type", "width", "height", "enlarge", "extend"],
	},
	size: {
		full: "size",
		short: "s",
		meta: true,
		metaOptions: ["width", "height", "enlarge", "extend"],
	},
	s: {
		full: "size",
		short: "s",
		meta: true,
		metaOptions: ["width", "height", "enlarge", "extend"],
	},
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

function validate_signature(salt: string, target: string, key: string, signature: string) {
	if (!_verify(salt, target, key, signature)) {
		throw new Error("Signature verification failed");
	}
}
function _verify(salt: string, target: string, key: string, signature: string) {
	return _stringTimingSafeEqual(signature, _sign(salt, target, key));
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
function _sign(salt: string, target: string, key: string) {
	const hmac = crypto.createHmac("sha256", _hexDecode(key));
	hmac.update(_hexDecode(salt));
	hmac.update(target);
	return hmac.digest("base64url");
}
function _hexDecode(hex: string) {
	return Buffer.from(hex, "hex");
}
function _trimSeparators(urlStr: string) {
	return urlStr.replaceAll(/^\/|\/$/g, "");
}
async function handler(event: AWSCloudFrontFunction.Event) {
	const request = event.request;

	const kvsResponse = await getEnvironmentVariables();

	if (kvsResponse.none !== undefined) {
		return sendError(403, "Forbidden", "", kvsResponse.none);
	}

	const IMGPROXY_SALT = kvsResponse.some.IMGPROXY_SALT;
	const IMGPROXY_KEY = kvsResponse.some.IMGPROXY_KEY;
	const IMGPROXY_ARGUMENTS_SEPARATOR = kvsResponse.some.IMGPROXY_ARGUMENTS_SEPARATOR;

	const imgproxyUriRegexp = new RegExp(
		`^\\/([^\\/]+)\\/((?:[a-z]+\\${IMGPROXY_ARGUMENTS_SEPARATOR}[^\\/]+\\/)+)?(plain\\/|enc\\/)?(.+)`,
		"g",
	);

	const uriRegexpResult = imgproxyUriRegexp.exec(request.uri);

	if (uriRegexpResult === null) {
		return sendError(403, "Forbidden", "", new Error("Unable to parse URI"));
	}

	if (uriRegexpResult[1] === undefined) {
		return sendError(403, "Forbidden", "", new Error("Signature is missing from URI"));
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
	} catch (err) {
		return sendError(
			403,
			"Forbidden",
			"",
			new Error("Signature verification failed", { cause: err }),
		);
	}

	const processingOptionsMap = Object.create(null);
	const optionStrings = _trimSeparators(processingOptionsString).split("/");

	for (let i = 0; i < optionStrings.length; i++) {
		const optionString = optionStrings[i];
		const optionArr = optionString.split(IMGPROXY_ARGUMENTS_SEPARATOR);
		const option = optionArr.shift();
		const args = optionArr;

		if (option !== undefined && args.length > 0) {
			const optionMap = indexedOptions[option];

			if (optionMap !== undefined) {
				if ((optionMap as ImgproxyMetaOption).meta !== undefined) {
					const metaOptions = (<ImgproxyMetaOption>optionMap).metaOptions;

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
									metaOptionMap.short !== undefined ? metaOptionMap.short : metaOption;
								delete processingOptionsMap[preferredKey];
								processingOptionsMap[preferredKey] = individualOptionArgs.join(
									IMGPROXY_ARGUMENTS_SEPARATOR,
								);
							}
						}
					}
				} else {
					const preferredKey = optionMap.short !== undefined ? optionMap.short : option;
					delete processingOptionsMap[preferredKey];
					processingOptionsMap[preferredKey] = args.join(IMGPROXY_ARGUMENTS_SEPARATOR);
				}
			}
		}
	}

	const normalizedOptionsArr: string[] = [];
	const entries = Object.entries(processingOptionsMap);
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		normalizedOptionsArr.push(entry.join(IMGPROXY_ARGUMENTS_SEPARATOR));
	}
	const normalizedOptionsString = normalizedOptionsArr.join("/");
	const newImgproxyPath = `/${normalizedOptionsString}/${sourceUrlType}${sourceUrl}`;
	const newUri = `/${_sign(IMGPROXY_SALT, newImgproxyPath, IMGPROXY_KEY)}${newImgproxyPath}`;
	request.uri = newUri;
	return request;
}

async function getEnvironmentVariables(): Promise<Option<Record<string, string>, Error>> {
	const kvsHandle = cf.kvs();
	try {
		const IMGPROXY_SALT = await kvsHandle.get(imgproxySalt, { format: "string" });
		const IMGPROXY_KEY = await kvsHandle.get(imgproxyKey, { format: "string" });
		const IMGPROXY_ARGUMENTS_SEPARATOR = await kvsHandle.get(imgproxyArgumentsSeparotor, {
			format: "string",
		});
		return {
			some: {
				IMGPROXY_SALT: IMGPROXY_SALT,
				IMGPROXY_KEY: IMGPROXY_KEY,
				IMGPROXY_ARGUMENTS_SEPARATOR: IMGPROXY_ARGUMENTS_SEPARATOR,
			},
		};
	} catch (err) {
		return { none: new Error("Failed to retrieve value from key value store", { cause: err }) };
	}
}

function sendError(statusCode: number, statusText: string, body: string, error: Error) {
	logError(body, error);
	return { statusCode, statusText, body };
}
function logError(body: string, error: Error) {
	console.log("APPLICATION ERROR", body);
	console.log(error);
}
