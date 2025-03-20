import crypto from "node:crypto";

import type { FunctionEventRequest, FunctionRequestEvent } from "@pilchard/aws-cloudfront-function";
import type { UrlRewrite } from "../url-rewrite.d.ts";

const _hexDecode = (hex: string) => Buffer.from(hex, "hex");

const _sign = (salt: string, target: string, secret: string, size: number) => {
	const hmac = crypto.createHmac("sha256", _hexDecode(secret));
	hmac.update(_hexDecode(salt));
	hmac.update(target);

	return Buffer.from(hmac.digest().slice(0, size)).toString("base64url");
};

function _testDataFromOptions(inputOptions: string[], expectedOptions: string[], config: UrlRewrite.Config = configSigningDisabled) {
	const { imgproxy_salt, imgproxy_key, imgproxy_signature_size } = config;
	const signingEnabled = !!(imgproxy_salt.length && imgproxy_key.length);

	const inputUri = `/${inputOptions.join("/")}/${sourceUrl}`;
	const inputSignature = signingEnabled ? _sign(imgproxy_salt, inputUri, imgproxy_key, imgproxy_signature_size) : "unsigned";
	const signedInputUri = `/${inputSignature}${inputUri}`;

	const event: FunctionRequestEvent = { ...baseEvent, request: { ...baseEvent.request, uri: signedInputUri } };

	const outputUri = `/${expectedOptions.join("/")}/${sourceUrl}`;
	const outputSignature = signingEnabled ? _sign(imgproxy_salt, outputUri, imgproxy_key, imgproxy_signature_size) : "unsigned";
	const signedOutputUri = `/${outputSignature}${outputUri}`;

	const expected: FunctionEventRequest = { ...baseEvent.request, uri: signedOutputUri };

	return { event, config, expected };
}

const sourceUrl =
	"aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn";

// Viewer-Request Event base
const baseEvent: FunctionRequestEvent = {
	version: "1.0",
	context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
	viewer: { ip: "1.2.3.4" },
	request: {
		method: "GET",
		uri: "/unsigned/rs:fill:300:400:0/preset:square/w:10/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn",
		headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
		querystring: {},
		cookies: {},
	},
};
// config
const configSigningDisabled: UrlRewrite.Config = {
	imgproxy_salt: "",
	imgproxy_key: "",
	imgproxy_signature_size: 32,
	imgproxy_trusted_signatures: [],
	imgproxy_arguments_separator: ":",
	log_level: "error",
};

const configSimpleSigning: UrlRewrite.Config = {
	imgproxy_salt: "simplesalt",
	imgproxy_key: "simplekey",
	imgproxy_signature_size: 32,
	imgproxy_trusted_signatures: [],
	imgproxy_arguments_separator: ":",
	log_level: "error",
};
// // /dev/random signing

export const data: { event: FunctionRequestEvent; config: UrlRewrite.Config; expected: FunctionEventRequest; }[] = [{
	/** S I G N I N G */
	event: {
		version: "1.0",
		context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
		viewer: { ip: "1.2.3.4" },
		request: {
			method: "GET",
			uri: "/PDxCsU6y6iLkdexDLyHHb4LPEvUmY5r9mWg9updCChY/rs:fill:300:400:0:0:ce/preset:square/w:10/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn",
			headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
			querystring: {},
			cookies: {},
		},
	},
	config: configSimpleSigning,
	expected: {
		method: "GET",
		uri: "/EMoOpuFyriqwIl3vqf0KwkdShTj6XLF1FVHQsjwwTbs/rt:fill/h:400/el:0/ex:0:ce/pr:square/w:10/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn",
		querystring: {},
		headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
		cookies: {},
	},
}, {
	event: {
		version: "1.0",
		context: { eventType: "viewer-request", distributionDomainName: "", distributionId: "", requestId: "" },
		viewer: { ip: "1.2.3.4" },
		request: {
			method: "GET",
			uri: "/unsigned/rs:fill:300:400:0/preset:square/w:10/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn",
			headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
			querystring: {},
			cookies: {},
		},
	},
	config: {
		imgproxy_salt: "",
		imgproxy_key: "",
		imgproxy_signature_size: 32,
		imgproxy_trusted_signatures: [],
		imgproxy_arguments_separator: ":",
		log_level: "error",
	},
	expected: {
		method: "GET",
		uri: "/unsigned/rt:fill/h:400/el:0/pr:square/w:10/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL00v/TVY1Qk1tUTNabVk0/TnpZdFkyVm1ZaTAw/WkRSbUxUZ3lPREF0/WldZelpqaGxOemsx/TnpVMlhrRXlYa0Zx/Y0dkZVFYVnlOVGMz/TWpVek5USUAuanBn",
		querystring: {},
		headers: { host: { value: "https://test.local" }, accept: { value: "image/*" } },
		cookies: {},
	},
}];

const metaOptionRawData: [string[], string[]][] = [
	/**
	 * Resize - meta-option
	 *
	 * resize:%resizing_type:%width:%height:%enlarge:%extend
	 * rs:%resizing_type:%width:%height:%enlarge:%extend
	 *
	 * This is a meta-option that defines the `resizing-type`, `width`, `height`, `enlarge`, and `extend`.
	 * All arguments are optional and can be omitted to use their default values.
	 *
	 * resize:%resizing_type:%width:%height:%enlarge:%extend
	 * rs:%resizing_type:%width:%height:%enlarge:%extend
	 *
	 * Resizing type - Defines how imgproxy will resize the source image.
	 * resizing_type:%resizing_type
	 * rt:%resizing_type
	 *
	 * Supported resizing types are:
	 * - `fit`: resizes the image while keeping aspect ratio to fit a given size.
	 * - `fill`: resizes the image while keeping aspect ratio to fill a given size and crops
	 *      projecting parts.
	 * - `fill-down`: the same as fill, but if the resized image is smaller than the requested size,
	 *      imgproxy will crop the result to keep the requested aspect ratio.
	 * - `force`: resizes the image without keeping the aspect ratio.
	 * - `auto`: if both source and resulting dimensions have the same orientation
	 *      (portrait or landscape), imgproxy will use `fill`. Otherwise, it will use `fit`.
	 *
	 * Width - Defines the width of the resulting image. When set to 0, imgproxy will calculate
	 * width using the defined height and source aspect ratio. When set to 0 and resizing type
	 * is force, imgproxy will keep the original width.
	 *
	 * width:%width
	 * w:%width
	 *
	 * Height - Defines the height of the resulting image. When set to 0, imgproxy will calculate
	 * resulting height using the defined width and source aspect ratio. When set to 0 and resizing
	 * type is force, imgproxy will keep the original height.
	 *
	 * height:%height
	 * h:%height
	 *
	 * Enlarge - When set to `1`, `t` or `true`, imgproxy will enlarge the image if it is smaller than
	 * the given size.
	 *
	 * enlarge:%enlarge
	 * el:%enlarge
	 *
	 * Extend - When set to `1`, `t` or `true`, imgproxy will extend the image if it is smaller than the given size.
	 *
	 * extend:%extend:%gravity
	 * ex:%extend:%gravity
	 *
	 * - gravity (optional) accepts the same values as the gravity option, except sm, obj, and objw. When gravity is not set, imgproxy will use ce gravity without offsets.
	 *      - gravity:%type:%x_offset:%y_offset
	 *          - type - specifies the gravity type. Available values:
	 *              - `no`: north (top edge)
	 *              - `so`: south (bottom edge)
	 *              - `ea`: east (right edge)
	 *              - `we`: west (left edge)
	 *              - `noea`: north-east (top-right corner)
	 *              - `nowe`: north-west (top-left corner)
	 *              - `soea`: south-east (bottom-right corner)
	 *              - `sowe`: south-west (bottom-left corner)
	 *              - `ce`: center
	 *          - `x_offset`, `y_offset` - (optional) specifies the gravity offset along the X and Y axes:
	 *              - When `x_offset` or `y_offset` is greater than or equal to `1`, imgproxy treats it as an absolute value.
	 *              - When `x_offset` or `y_offset` is less than `1`, imgproxy treats it as a relative value.
	 */
	// `resize`
	[["resize:fit:100:200:0:0:no:0.1:0.2"], ["rt:fit", "w:100", "h:200", "el:0", "ex:0:no:0.1:0.2"]],
	[["resize:fill:100:200:1:1:no:0.1:0.2"], ["rt:fill", "w:100", "h:200", "el:1", "ex:1:no:0.1:0.2"]],
	[["resize:fit:100:200:false:false:noea:1:2"], ["rt:fit", "w:100", "h:200", "el:0", "ex:0:noea:1:2"]],
	[["resize:fill:100:200:true:true:noea:1:2"], ["rt:fill", "w:100", "h:200", "el:1", "ex:1:noea:1:2"]],
	[["resize:fill-down:100:200:f:f:ce"], ["rt:fill-down", "w:100", "h:200", "el:0", "ex:0:ce"]],
	[["resize:auto:100:200:t:t:we:1:0.2"], ["rt:auto", "w:100", "h:200", "el:1", "ex:1:we:1:0.2"]],
	// `rs`
	[["rs:fit:100:200:0:0:no:0.1:0.2"], ["rt:fit", "w:100", "h:200", "el:0", "ex:0:no:0.1:0.2"]],
	[["rs:fill:100:200:1:1:no:0.1:0.2"], ["rt:fill", "w:100", "h:200", "el:1", "ex:1:no:0.1:0.2"]],
	[["rs:fit:100:200:false:false:noea:1:2"], ["rt:fit", "w:100", "h:200", "el:0", "ex:0:noea:1:2"]],
	[["rs:fill:100:200:true:true:noea:1:2"], ["rt:fill", "w:100", "h:200", "el:1", "ex:1:noea:1:2"]],
	[["rs:fill-down:100:200:f:f:ce"], ["rt:fill-down", "w:100", "h:200", "el:0", "ex:0:ce"]],
	[["rs:auto:100:200:t:t:we:1:0.2"], ["rt:auto", "w:100", "h:200", "el:1", "ex:1:we:1:0.2"]],
	/**
	 * Size - meta-option
	 *
	 * size:%width:%height:%enlarge:%extend
	 * s:%width:%height:%enlarge:%extend
	 *
	 * This is a meta-option that defines the width, height, enlarge, and extend. All arguments are optional and can be omitted to use their default values.
	 */
	// `size
	[["size:100:200:0:0:no:0.1:0.2"], ["w:100", "h:200", "el:0", "ex:0:no:0.1:0.2"]],
	[["size:100:200:1:1:no:0.1:0.2"], ["w:100", "h:200", "el:1", "ex:1:no:0.1:0.2"]],
	[["size:100:200:false:false:noea:1:2"], ["w:100", "h:200", "el:0", "ex:0:noea:1:2"]],
	[["size:100:200:true:true:noea:1:2"], ["w:100", "h:200", "el:1", "ex:1:noea:1:2"]],
	[["size:100:200:f:f:ce"], ["w:100", "h:200", "el:0", "ex:0:ce"]],
	[["size:100:200:t:t:we:1:0.2"], ["w:100", "h:200", "el:1", "ex:1:we:1:0.2"]],
	// `s`
	[["s:100:200:0:0:no:0.1:0.2"], ["w:100", "h:200", "el:0", "ex:0:no:0.1:0.2"]],
	[["s:100:200:1:1:no:0.1:0.2"], ["w:100", "h:200", "el:1", "ex:1:no:0.1:0.2"]],
	[["s:100:200:false:false:noea:1:2"], ["w:100", "h:200", "el:0", "ex:0:noea:1:2"]],
	[["s:100:200:true:true:noea:1:2"], ["w:100", "h:200", "el:1", "ex:1:noea:1:2"]],
	[["s:100:200:f:f:ce"], ["w:100", "h:200", "el:0", "ex:0:ce"]],
	[["s:100:200:t:t:we:1:0.2"], ["w:100", "h:200", "el:1", "ex:1:we:1:0.2"]],
	/**
	 * Adjust (meta-option) [pro]
	 * adjust:%brightness:%contrast:%saturation
	 * a:%brightness:%contrast:%saturation
	 *
	 * Brightness - an integer number ranging from `-255` to `255`.
	 * brightness:%brightness
	 * br:%brightness
	 *
	 * Contrast - a positive floating point number, where a value of `1` leaves the contrast unchanged.
	 * contrast:%contrast
	 * co:%contrast
	 *
	 * Saturation - a positive floating-point number, where a value of `1` leaves the saturation unchanged.
	 * saturation:%saturation
	 * sa:%saturation
	 */
	// `adjust`
	[["adjust:-100:0.2:1"], ["br:-100", "co:0.2", "sa:1"]],
	[["adjust:100:0.2:0.5"], ["br:100", "co:0.2", "sa:0.5"]],
	[["adjust:100:0.2"], ["br:100", "co:0.2"]],
	[["adjust:100"], ["br:100"]],
	// `a`
	[["a:-100:0.2:1"], ["br:-100", "co:0.2", "sa:1"]],
	[["a:100:0.2:0.5"], ["br:100", "co:0.2", "sa:0.5"]],
	[["a:100:0.2"], ["br:100", "co:0.2"]],
	[["a:100"], ["br:100"]],
];

const stdOptionRawData: [string[], string[]][] = [
	/**
	 * Resizing type - Defines how imgproxy will resize the source image.
	 * resizing_type:%resizing_type
	 * rt:%resizing_type
	 *
	 * Supported resizing types are:
	 * - `fit`: resizes the image while keeping aspect ratio to fit a given size.
	 * - `fill`: resizes the image while keeping aspect ratio to fill a given size and crops
	 *      projecting parts.
	 * - `fill-down`: the same as fill, but if the resized image is smaller than the requested size,
	 *      imgproxy will crop the result to keep the requested aspect ratio.
	 * - `force`: resizes the image without keeping the aspect ratio.
	 * - `auto`: if both source and resulting dimensions have the same orientation
	 *      (portrait or landscape), imgproxy will use `fill`. Otherwise, it will use `fit`.
	 */
	[["resizing_type:fit"], ["rt:fit"]],
	[["resizing_type:fill"], ["rt:fill"]],
	[["resizing_type:fill-down"], ["rt:fill-down"]],
	[["resizing_type:force"], ["rt:force"]],
	[["resizing_type:auto"], ["rt:auto"]],
	[["rt:fit"], ["rt:fit"]],
	[["rt:fill"], ["rt:fill"]],
	[["rt:fill-down"], ["rt:fill-down"]],
	[["rt:force"], ["rt:force"]],
	[["rt:auto"], ["rt:auto"]],
	/**
	 * Resizing algorithm [pro]
	 * resizing_algorithm:%algorithm
	 * ra:%algorithm
	 * Defines the algorithm that imgproxy will use for resizing. Supported algorithms are `nearest`, `linear`, `cubic`, `lanczos2`, and `lanczos3`.
	 * @default: lanczos3
	 */
	[["resizing_algorithm:nearest"], ["ra:nearest"]],
	[["resizing_algorithm:linear"], ["ra:linear"]],
	[["resizing_algorithm:cubic"], ["ra:cubic"]],
	[["resizing_algorithm:lanczos2"], ["ra:lanczos2"]],
	[["resizing_algorithm:lanczos3"], ["ra:lanczos3"]],
	[["ra:nearest"], ["ra:nearest"]],
	[["ra:linear"], ["ra:linear"]],
	[["ra:cubic"], ["ra:cubic"]],
	[["ra:lanczos2"], ["ra:lanczos2"]],
	[["ra:lanczos3"], ["ra:lanczos3"]],
	/**
	 * Width
	 * width:%width
	 * w:%width
	 *
	 * Defines the width of the resulting image. When set to 0, imgproxy will calculate width using
	 * the defined height and source aspect ratio. When set to 0 and resizing type is force, imgproxy
	 * will keep the original width.
	 *
	 * @default: 0
	 */
	[["width:10"], ["w:10"]],
	[["w:10"], ["w:10"]],
	/**
	 * Height
	 * height:%height
	 * h:%height
	 *
	 * Defines the height of the resulting image. When set to 0, imgproxy will calculate resulting
	 * height using the defined width and source aspect ratio. When set to 0 and resizing type is
	 * force, imgproxy will keep the original height.
	 *
	 * @default: 0
	 */
	[["height:100"], ["h:100"]],
	[["h:100"], ["h:100"]],
	/**
	 * Min-width
	 * min-width:%width
	 * mw:%width
	 *
	 * Defines the minimum width of the resulting image.
	 *
	 * __warning__: When both width and min-width are set, the final image will be cropped according
	 * to width, so use this combination with care.
	 *
	 * @default: 0
	 */
	[["min_width:100"], ["mw:100"]],
	[["mw:100"], ["mw:100"]],

	[["min_height:100"], ["mh:100"]],
	[["mh:100"], ["mh:100"]],

	/**
	 * Zoom
	 * zoom:%zoom_x_y
	 * z:%zoom_x_y
	 *
	 * zoom:%zoom_x:%zoom_y
	 * z:%zoom_x:%zoom_y
	 *
	 * When set, imgproxy will multiply the image dimensions according to these factors.
	 * __The values must be greater than 0__.
	 *
	 * Can be combined with width and height options. In this case, imgproxy calculates scale
	 * factors for the provided size and then multiplies it with the provided zoom factors.
	 *
	 * __info__: Unlike the dpr option, the zoom option doesn't affect gravities offsets,
	 * watermark offsets, and paddings.
	 *
	 * @default: 1
	 */
	[["zoom:10"], ["z:10"]],
	[["z:10"], ["z:10"]],
	[["zoom:10:20"], ["z:10:20"]],
	[["z:10:20"], ["z:10:20"]],
	/**
	 * Dpr
	 * dpr:%dpr
	 *
	 * When set, imgproxy will multiply the image dimensions according to this factor for
	 * HiDPI (Retina) devices. The value must be greater than 0.
	 *
	 * __info__: The dpr option affects gravities offsets, watermark offsets, and paddings to make
	 * the resulting image structures with and without the dpr option applied match.
	 *
	 * @default: 1
	 */
	[["dpr:3"], ["dpr:3"]],
	/**
	 * Enlarge (bool)
	 * enlarge:%enlarge
	 * el:%enlarge
	 *
	 * When set to 1, t or true, imgproxy will enlarge the image if it is smaller than the given size.
	 *
	 * @default: false
	 */
	// false
	[["enlarge:0"], ["el:0"]],
	[["el:0"], ["el:0"]],
	[["enlarge:f"], ["el:0"]],
	[["el:f"], ["el:0"]],
	[["enlarge:false"], ["el:0"]],
	[["el:false"], ["el:0"]],
	// random string value == falsey
	[["enlarge:nope"], ["el:0"]],
	[["el:nope"], ["el:0"]],
	// true - valid truthy values: `1`, `t` or `true`
	[["enlarge:1"], ["el:1"]],
	[["el:1"], ["el:1"]],
	[["enlarge:t"], ["el:1"]],
	[["el:t"], ["el:1"]],
	[["enlarge:true"], ["el:1"]],
	[["el:true"], ["el:1"]],
	/**
	 * Extend
	 * extend:%extend:%gravity
	 * ex:%extend:%gravity
	 *
	 * When extend is set to 1, t or true, imgproxy will extend the image if it is smaller than
	 * the given size.
	 *
	 * gravity (optional) accepts the same values as the gravity option, except `sm`, `obj`, and `objw`.
	 * When gravity is not set, imgproxy will use `ce` gravity without offsets
	 *
	 * @default: false:ce:0:0
	 */
	[["extend:0:no:0.1:0.2"], ["ex:0:no:0.1:0.2"]],
	[["extend:1:no:0.1:0.2"], ["ex:1:no:0.1:0.2"]],
	[["extend:false:noea:1:2"], ["ex:0:noea:1:2"]],
	[["extend:true:noea:1:2"], ["ex:1:noea:1:2"]],
	[["extend:f:ce"], ["ex:0:ce"]],
	[["extend:t:we:1:0.2"], ["ex:1:we:1:0.2"]],

	[["ex:0:no:0.1:0.2"], ["ex:0:no:0.1:0.2"]],
	[["ex:1:no:0.1:0.2"], ["ex:1:no:0.1:0.2"]],
	[["ex:false:noea:1:2"], ["ex:0:noea:1:2"]],
	[["ex:true:noea:1:2"], ["ex:1:noea:1:2"]],
	[["ex:f:ce"], ["ex:0:ce"]],
	[["ex:t:we:1:0.2"], ["ex:1:we:1:0.2"]],
	/**
	 * Extend aspect ratio
	 * extend_aspect_ratio:%extend:%gravity
	 * extend_ar:%extend:%gravity
	 * exar:%extend:%gravity
	 *
	 * When extend is set to `1`, `t` or `true`, imgproxy will extend the image if it is smaller than
	 * the given size.
	 *
	 * gravity (optional) accepts the same values as the gravity option, except `sm`, `obj`, and `objw`.
	 * When gravity is not set, imgproxy will use `ce` gravity without offsets
	 *
	 * @default: false:ce:0:0
	 */
	[["extend_aspect_ratio:0:no:0.1:0.2"], ["exar:0:no:0.1:0.2"]],
	[["extend_aspect_ratio:1:no:0.1:0.2"], ["exar:1:no:0.1:0.2"]],
	[["extend_aspect_ratio:false:noea:1:2"], ["exar:0:noea:1:2"]],
	[["extend_aspect_ratio:true:noea:1:2"], ["exar:1:noea:1:2"]],
	[["extend_aspect_ratio:f:ce"], ["exar:0:ce"]],
	[["extend_aspect_ratio:t:we:1:0.2"], ["exar:1:we:1:0.2"]],

	[["extend_ar:0:no:0.1:0.2"], ["exar:0:no:0.1:0.2"]],
	[["extend_ar:1:no:0.1:0.2"], ["exar:1:no:0.1:0.2"]],
	[["extend_ar:false:noea:1:2"], ["exar:0:noea:1:2"]],
	[["extend_ar:true:noea:1:2"], ["exar:1:noea:1:2"]],
	[["extend_ar:f:ce"], ["exar:0:ce"]],
	[["extend_ar:t:we:1:0.2"], ["exar:1:we:1:0.2"]],

	[["exar:0:no:0.1:0.2"], ["exar:0:no:0.1:0.2"]],
	[["exar:1:no:0.1:0.2"], ["exar:1:no:0.1:0.2"]],
	[["exar:false:noea:1:2"], ["exar:0:noea:1:2"]],
	[["exar:true:noea:1:2"], ["exar:1:noea:1:2"]],
	[["exar:f:ce"], ["exar:0:ce"]],
	[["exar:t:we:1:0.2"], ["exar:1:we:1:0.2"]],
	/**
	 * Gravity
	 * gravity:%type:%x_offset:%y_offset
	 * g:%type:%x_offset:%y_offset
	 *
	 * When imgproxy needs to cut some parts of the image, it is guided by the gravity option.
	 * type - specifies the gravity type. Available values:
	 * - no: north (top edge)
	 * - so: south (bottom edge)
	 * - ea: east (right edge)
	 * - we: west (left edge)
	 * - noea: north-east (top-right corner)
	 * - nowe: north-west (top-left corner)
	 * - soea: south-east (bottom-right corner)
	 * - sowe: south-west (bottom-left corner)
	 * - ce: center
	 *
	 * x_offset, y_offset - (optional) specifies the gravity offset along the X and Y axes:
	 * - When x_offset or y_offset is greater than or equal to 1, imgproxy treats it as an absolute value.
	 * - When x_offset or y_offset is less than 1, imgproxy treats it as a relative value.
	 *
	 * Default: ce:0:0
	 */
	[["gravity:no"], ["g:no"]],
	[["gravity:so"], ["g:so"]],
	[["gravity:ea"], ["g:ea"]],
	[["gravity:we"], ["g:we"]],
	[["gravity:noea"], ["g:noea"]],
	[["gravity:nowe"], ["g:nowe"]],
	[["gravity:soea"], ["g:soea"]],
	[["gravity:sowe"], ["g:sowe"]],
	[["gravity:ce"], ["g:ce"]],

	[["gravity:no:1"], ["g:no:1"]],
	[["gravity:so:1"], ["g:so:1"]],
	[["gravity:ea:1"], ["g:ea:1"]],
	[["gravity:we:1"], ["g:we:1"]],
	[["gravity:noea:1"], ["g:noea:1"]],
	[["gravity:nowe:1"], ["g:nowe:1"]],
	[["gravity:soea:1"], ["g:soea:1"]],
	[["gravity:sowe:1"], ["g:sowe:1"]],
	[["gravity:ce:1"], ["g:ce:1"]],

	[["gravity:no:1:2"], ["g:no:1:2"]],
	[["gravity:so:1:2"], ["g:so:1:2"]],
	[["gravity:ea:1:2"], ["g:ea:1:2"]],
	[["gravity:we:1:2"], ["g:we:1:2"]],
	[["gravity:noea:1:2"], ["g:noea:1:2"]],
	[["gravity:nowe:1:2"], ["g:nowe:1:2"]],
	[["gravity:soea:1:2"], ["g:soea:1:2"]],
	[["gravity:sowe:1:2"], ["g:sowe:1:2"]],
	[["gravity:ce:1:2"], ["g:ce:1:2"]],

	[["gravity:no:0.98:0.12"], ["g:no:0.98:0.12"]],
	[["gravity:so:0.98:0.12"], ["g:so:0.98:0.12"]],
	[["gravity:ea:0.98:0.12"], ["g:ea:0.98:0.12"]],
	[["gravity:we:0.98:0.12"], ["g:we:0.98:0.12"]],
	[["gravity:noea:0.98:0.12"], ["g:noea:0.98:0.12"]],
	[["gravity:nowe:0.98:0.12"], ["g:nowe:0.98:0.12"]],
	[["gravity:soea:0.98:0.12"], ["g:soea:0.98:0.12"]],
	[["gravity:sowe:0.98:0.12"], ["g:sowe:0.98:0.12"]],
	[["gravity:ce:0.98:0.12"], ["g:ce:0.98:0.12"]],

	[["g:no"], ["g:no"]],
	[["g:so"], ["g:so"]],
	[["g:ea"], ["g:ea"]],
	[["g:we"], ["g:we"]],
	[["g:noea"], ["g:noea"]],
	[["g:nowe"], ["g:nowe"]],
	[["g:soea"], ["g:soea"]],
	[["g:sowe"], ["g:sowe"]],
	[["g:ce"], ["g:ce"]],

	[["g:no:1"], ["g:no:1"]],
	[["g:so:1"], ["g:so:1"]],
	[["g:ea:1"], ["g:ea:1"]],
	[["g:we:1"], ["g:we:1"]],
	[["g:noea:1"], ["g:noea:1"]],
	[["g:nowe:1"], ["g:nowe:1"]],
	[["g:soea:1"], ["g:soea:1"]],
	[["g:sowe:1"], ["g:sowe:1"]],
	[["g:ce:1"], ["g:ce:1"]],

	[["g:no:1:2"], ["g:no:1:2"]],
	[["g:so:1:2"], ["g:so:1:2"]],
	[["g:ea:1:2"], ["g:ea:1:2"]],
	[["g:we:1:2"], ["g:we:1:2"]],
	[["g:noea:1:2"], ["g:noea:1:2"]],
	[["g:nowe:1:2"], ["g:nowe:1:2"]],
	[["g:soea:1:2"], ["g:soea:1:2"]],
	[["g:sowe:1:2"], ["g:sowe:1:2"]],
	[["g:ce:1:2"], ["g:ce:1:2"]],

	[["g:no:0.98:0.12"], ["g:no:0.98:0.12"]],
	[["g:so:0.98:0.12"], ["g:so:0.98:0.12"]],
	[["g:ea:0.98:0.12"], ["g:ea:0.98:0.12"]],
	[["g:we:0.98:0.12"], ["g:we:0.98:0.12"]],
	[["g:noea:0.98:0.12"], ["g:noea:0.98:0.12"]],
	[["g:nowe:0.98:0.12"], ["g:nowe:0.98:0.12"]],
	[["g:soea:0.98:0.12"], ["g:soea:0.98:0.12"]],
	[["g:sowe:0.98:0.12"], ["g:sowe:0.98:0.12"]],
	[["g:ce:0.98:0.12"], ["g:ce:0.98:0.12"]],
	/**
	 * Special gravities:
	 * - gravity:sm: smart gravity. libvips detects the most "interesting" section of the image
	 *      and considers it as the center of the resulting image. Offsets are not applicable here.
	 * - gravity:obj:%class_name1:%class_name2:...:%class_nameN: [pro]
	 *      object-oriented gravity. imgproxy detects objects of provided classes on the image and
	 *      calculates the resulting image center using their positions. If class names are omited,
	 *      imgproxy will use all the detected objects. Also, you can use the all pseudo-class to
	 *      use all the detected objects.
	 * - gravity:objw:%class_name1:%class_weight1:...:%class_nameN:%class_weightN: [pro]
	 *      object-oriented gravity with weights. The same as gravity:obj but with custom weights
	 *      for each class. You can use the all pseudo-class to set the weight for all the detected
	 *      objects. For example, gravity:objw:all:2:face:3 will set the weight of all the detected
	 *      objects to 2 and the weight of the detected faces to 3. The default weight is 1.
	 * - gravity:fp:%x:%y: the gravity focus point. x and y are floating point numbers
	 *      between 0 and 1 that define the coordinates of the center of the resulting image.
	 *      Treat 0 and 1 as right/left for x and top/bottom for y.
	 */
	[["gravity:sm"], ["g:sm"]],
	[["g:sm"], ["g:sm"]],

	[["gravity:obj:face:cat:dog"], ["g:obj:face:cat:dog"]],
	[["g:obj:face:cat:dog"], ["g:obj:face:cat:dog"]],

	[["gravity:objw:face:2:cat:3:dog:4"], ["g:objw:face:2:cat:3:dog:4"]],
	[["gravity:objw:all:2:face:10"], ["g:objw:all:2:face:10"]],
	[["g:objw:face:2:cat:3:dog:4"], ["g:objw:face:2:cat:3:dog:4"]],
	[["g:objw:all:2:face:10"], ["g:objw:all:2:face:10"]],

	[["gravity:fp:0.98:0.12"], ["g:fp:0.98:0.12"]],
	[["g:fp:0.98:0.12"], ["g:fp:0.98:0.12"]],
	/**
	 * Objects position [pro]
	 * objects_position:%type:%x_offset:%y_offset
	 * obj_pos:%type:%x_offset:%y_offset
	 * op:%type:%x_offset:%y_offset
	 *
	 * When imgproxy needs to cut some parts of the image, and the obj/objw gravity is used, the
	 * objects_position option allows you to adjust the position of the detected objects on the
	 * resulting image.
	 *
	 * type - specifies the position type. Available values:
	 * - no: north (top edge)
	 * - so: south (bottom edge)
	 * - ea: east (right edge)
	 * - we: west (left edge)
	 * - noea: north-east (top-right corner)
	 * - nowe: north-west (top-left corner)
	 * - soea: south-east (bottom-right corner)
	 * - sowe: south-west (bottom-left corner)
	 * - ce: center
	 *
	 * x_offset, y_offset - (optional) specifies the position offset along the X and Y axes.
	 *
	 * @default: ce:0:0
	 */
	[["objects_position:no"], ["op:no"]],
	[["objects_position:so"], ["op:so"]],
	[["objects_position:ea"], ["op:ea"]],
	[["objects_position:we"], ["op:we"]],
	[["objects_position:noea"], ["op:noea"]],
	[["objects_position:nowe"], ["op:nowe"]],
	[["objects_position:soea"], ["op:soea"]],
	[["objects_position:sowe"], ["op:sowe"]],
	[["objects_position:ce"], ["op:ce"]],

	[["objects_position:no:1"], ["op:no:1"]],
	[["objects_position:so:1"], ["op:so:1"]],
	[["objects_position:ea:1"], ["op:ea:1"]],
	[["objects_position:we:1"], ["op:we:1"]],
	[["objects_position:noea:1"], ["op:noea:1"]],
	[["objects_position:nowe:1"], ["op:nowe:1"]],
	[["objects_position:soea:1"], ["op:soea:1"]],
	[["objects_position:sowe:1"], ["op:sowe:1"]],
	[["objects_position:ce:1"], ["op:ce:1"]],

	[["objects_position:no:1:2"], ["op:no:1:2"]],
	[["objects_position:so:1:2"], ["op:so:1:2"]],
	[["objects_position:ea:1:2"], ["op:ea:1:2"]],
	[["objects_position:we:1:2"], ["op:we:1:2"]],
	[["objects_position:noea:1:2"], ["op:noea:1:2"]],
	[["objects_position:nowe:1:2"], ["op:nowe:1:2"]],
	[["objects_position:soea:1:2"], ["op:soea:1:2"]],
	[["objects_position:sowe:1:2"], ["op:sowe:1:2"]],
	[["objects_position:ce:1:2"], ["op:ce:1:2"]],

	[["objects_position:no:0.98:0.12"], ["op:no:0.98:0.12"]],
	[["objects_position:so:0.98:0.12"], ["op:so:0.98:0.12"]],
	[["objects_position:ea:0.98:0.12"], ["op:ea:0.98:0.12"]],
	[["objects_position:we:0.98:0.12"], ["op:we:0.98:0.12"]],
	[["objects_position:noea:0.98:0.12"], ["op:noea:0.98:0.12"]],
	[["objects_position:nowe:0.98:0.12"], ["op:nowe:0.98:0.12"]],
	[["objects_position:soea:0.98:0.12"], ["op:soea:0.98:0.12"]],
	[["objects_position:sowe:0.98:0.12"], ["op:sowe:0.98:0.12"]],
	[["objects_position:ce:0.98:0.12"], ["op:ce:0.98:0.12"]],

	[["obj_pos:no"], ["op:no"]],
	[["obj_pos:so"], ["op:so"]],
	[["obj_pos:ea"], ["op:ea"]],
	[["obj_pos:we"], ["op:we"]],
	[["obj_pos:noea"], ["op:noea"]],
	[["obj_pos:nowe"], ["op:nowe"]],
	[["obj_pos:soea"], ["op:soea"]],
	[["obj_pos:sowe"], ["op:sowe"]],
	[["obj_pos:ce"], ["op:ce"]],

	[["obj_pos:no:1"], ["op:no:1"]],
	[["obj_pos:so:1"], ["op:so:1"]],
	[["obj_pos:ea:1"], ["op:ea:1"]],
	[["obj_pos:we:1"], ["op:we:1"]],
	[["obj_pos:noea:1"], ["op:noea:1"]],
	[["obj_pos:nowe:1"], ["op:nowe:1"]],
	[["obj_pos:soea:1"], ["op:soea:1"]],
	[["obj_pos:sowe:1"], ["op:sowe:1"]],
	[["obj_pos:ce:1"], ["op:ce:1"]],

	[["obj_pos:no:1:2"], ["op:no:1:2"]],
	[["obj_pos:so:1:2"], ["op:so:1:2"]],
	[["obj_pos:ea:1:2"], ["op:ea:1:2"]],
	[["obj_pos:we:1:2"], ["op:we:1:2"]],
	[["obj_pos:noea:1:2"], ["op:noea:1:2"]],
	[["obj_pos:nowe:1:2"], ["op:nowe:1:2"]],
	[["obj_pos:soea:1:2"], ["op:soea:1:2"]],
	[["obj_pos:sowe:1:2"], ["op:sowe:1:2"]],
	[["obj_pos:ce:1:2"], ["op:ce:1:2"]],

	[["obj_pos:no:0.98:0.12"], ["op:no:0.98:0.12"]],
	[["obj_pos:so:0.98:0.12"], ["op:so:0.98:0.12"]],
	[["obj_pos:ea:0.98:0.12"], ["op:ea:0.98:0.12"]],
	[["obj_pos:we:0.98:0.12"], ["op:we:0.98:0.12"]],
	[["obj_pos:noea:0.98:0.12"], ["op:noea:0.98:0.12"]],
	[["obj_pos:nowe:0.98:0.12"], ["op:nowe:0.98:0.12"]],
	[["obj_pos:soea:0.98:0.12"], ["op:soea:0.98:0.12"]],
	[["obj_pos:sowe:0.98:0.12"], ["op:sowe:0.98:0.12"]],
	[["obj_pos:ce:0.98:0.12"], ["op:ce:0.98:0.12"]],

	[["op:no"], ["op:no"]],
	[["op:so"], ["op:so"]],
	[["op:ea"], ["op:ea"]],
	[["op:we"], ["op:we"]],
	[["op:noea"], ["op:noea"]],
	[["op:nowe"], ["op:nowe"]],
	[["op:soea"], ["op:soea"]],
	[["op:sowe"], ["op:sowe"]],
	[["op:ce"], ["op:ce"]],

	[["op:no:1"], ["op:no:1"]],
	[["op:so:1"], ["op:so:1"]],
	[["op:ea:1"], ["op:ea:1"]],
	[["op:we:1"], ["op:we:1"]],
	[["op:noea:1"], ["op:noea:1"]],
	[["op:nowe:1"], ["op:nowe:1"]],
	[["op:soea:1"], ["op:soea:1"]],
	[["op:sowe:1"], ["op:sowe:1"]],
	[["op:ce:1"], ["op:ce:1"]],

	[["op:no:1:2"], ["op:no:1:2"]],
	[["op:so:1:2"], ["op:so:1:2"]],
	[["op:ea:1:2"], ["op:ea:1:2"]],
	[["op:we:1:2"], ["op:we:1:2"]],
	[["op:noea:1:2"], ["op:noea:1:2"]],
	[["op:nowe:1:2"], ["op:nowe:1:2"]],
	[["op:soea:1:2"], ["op:soea:1:2"]],
	[["op:sowe:1:2"], ["op:sowe:1:2"]],
	[["op:ce:1:2"], ["op:ce:1:2"]],

	[["op:no:0.98:0.12"], ["op:no:0.98:0.12"]],
	[["op:so:0.98:0.12"], ["op:so:0.98:0.12"]],
	[["op:ea:0.98:0.12"], ["op:ea:0.98:0.12"]],
	[["op:we:0.98:0.12"], ["op:we:0.98:0.12"]],
	[["op:noea:0.98:0.12"], ["op:noea:0.98:0.12"]],
	[["op:nowe:0.98:0.12"], ["op:nowe:0.98:0.12"]],
	[["op:soea:0.98:0.12"], ["op:soea:0.98:0.12"]],
	[["op:sowe:0.98:0.12"], ["op:sowe:0.98:0.12"]],
	[["op:ce:0.98:0.12"], ["op:ce:0.98:0.12"]],
	/**
	 * Special positions:
	 *
	 * - objects_position:fp:%x:%y: the focus point position. x and y are floating point numbers
	 *      between 0 and 1 that define the coordinates of the center of the objects' area in the
	 *      resulting image. Treat 0 and 1 as right/left for x and top/bottom for y.
	 * - objects_position:prop: the proportional position. imgproxy will try to set object offsets
	 *      in the resulting image proportional to their offsets in the original image. This
	 *      position type allows the picture scene to be maintained after cropping.
	 */
	[["objects_position:fp:0.98:0.12"], ["op:fp:0.98:0.12"]],
	[["obj_pos:fp:0.98:0.12"], ["op:fp:0.98:0.12"]], // alt
	[["op:fp:0.98:0.12"], ["op:fp:0.98:0.12"]],

	[["objects_position:prop"], ["op:prop"]],
	[["obj_pos:prop"], ["op:prop"]], // alt
	[["op:prop"], ["op:prop"]],
	/**
	 * Crop
	 * crop:%width:%height:%gravity
	 * c:%width:%height:%gravity
	 *
	 * Defines an area of the image to be processed (crop before resize).
	 *
	 * width and height define the size of the area:
	 * - When width or height is greater than or equal to 1, imgproxy treats it as an absolute value.
	 * - When width or height is less than 1, imgproxy treats it as a relative value.
	 * - When width or height is set to 0, imgproxy will use the full width/height of the source image.
	 *
	 * gravity (optional) accepts the same values as the gravity option. When gravity is not set,
	 * imgproxy will use the value of the gravity option.
	 */
	[["crop:100:200:nowe"], ["c:100:200:nowe"]],
	[["c:100:200:nowe"], ["c:100:200:nowe"]],
	/** @todo implement partial argument updates */
	// [["crop:100:200:nowe", "crop:200"], ["c:200:200:nowe"]],
	// [["c:100:200:nowe", "crop:200"], ["c:200:200:nowe"]],
	/**
	 * Trim
	 * trim:%threshold:%color:%equal_hor:%equal_ver
	 * t:%threshold:%color:%equal_hor:%equal_ver
	 *
	 * Removes surrounding background.
	 * - threshold - color similarity tolerance.
	 * - color - (optional) a hex-coded value of the color that needs to be cut off.
	 * - equal_hor - (optional) set to 1, t or true, imgproxy will cut only equal parts from left
	 *      and right sides. That means that if 10px of background can be cut off from the left
	 *      and 5px from the right, then 5px will be cut off from both sides. For example, this
	 *      can be useful if objects on your images are centered but have non-symmetrical shadow.
	 * - equal_ver - (optional) acts like equal_hor but for top/bottom sides.
	 */
	[["trim:10:FF00FF:f:t"], ["t:10:ff00ff:0:1"]],
	[["trim:10:1100ab:f:t"], ["t:10:1100ab:0:1"]],
	[["trim:10::f:t"], ["t:10::0:1"]],
	[["t:10:1100ab:f:t"], ["t:10:1100ab:0:1"]],
	[["t:10:1100ab:f:t"], ["t:10:1100ab:0:1"]],
	[["t:10::f:t"], ["t:10::0:1"]],
	// [["t"], []],
	/**
	 * padding
	 */
	// [["padding"], []],
	// [["pd"], []],
	/**
	 * auto_rotate
	 */
	// [["auto_rotate"], []],
	// [["ar"], []],
	/**
	 * rotate
	 */
	// [["rotate"], []],
	// [["rot"], []],
	/**
	 * background
	 */
	// [["background"], []],
	// [["bg"], []],
	/**
	 * background_alpha
	 */
	// [["background_alpha"], []],
	// [["bga"], []],
	/**
	 * brightness
	 */
	// [["brightness"], []],
	// [["br"], []],
	/**
	 * contrast
	 */
	// [["contrast"], []],
	// [["co"], []],
	/**
	 * saturation
	 */
	// [["saturation"], []],
	// [["sa"], []],
	/**
	 * monochrome
	 */
	// [["monochrome"], []],
	// [["mc"], []],
	/**
	 * duotone
	 */
	// [["duotone"], []],
	// [["dt"], []],
	/**
	 * blur
	 */
	// [["blur"], []],
	// [["bl"], []],
	/**
	 * sharpen
	 */
	// [["sharpen"], []],
	// [["sh"], []],
	/**
	 * pixelate
	 */
	// [["pixelate"], []],
	// [["pix"], []],
	/**
	 * unsharp_masking
	 */
	// [["unsharp_masking"], []],
	// [["ush"], []],
	/**
	 * blur_detections
	 */
	// [["blur_detections"], []],
	// [["bd"], []],
	/**
	 * draw_detections
	 */
	// [["draw_detections"], []],
	// [["dd"], []],
	/**
	 * colorize
	 */
	// [["colorize"], []],
	// [["col"], []],
	/**
	 * gradient
	 */
	// [["gradient"], []],
	// [["gr"], []],
	/**
	 * watermark
	 */
	// [["watermark"], []],
	// [["wm"], []],
	/**
	 * watermark_url
	 */
	// [["watermark_url"], []],
	// [["wmu"], []],
	/**
	 * watermark_text
	 */
	// [["watermark_text"], []],
	// [["wmt"], []],
	/**
	 * watermark_size
	 */
	// [["watermark_size"], []],
	// [["wms"], []],
	/**
	 * watermark_rotate
	 */
	// [["watermark_rotate"], []],
	// [["wmr"], []],
	// [["wm_rot"], []], // alt
	/**
	 * watermark_shadow
	 */
	// [["watermark_shadow"], []],
	// [["wmsh"], []],
	/**
	 * style
	 */
	// [["style"], []],
	// [["st"], []],
	/**
	 * strip_metadata
	 */
	// [["strip_metadata"], []],
	// [["sm"], []],
	/**
	 * keep_copyright
	 */
	// [["keep_copyright"], []],
	// [["kcr"], []],
	/**
	 * dpi
	 */
	// [["dpi"], []],
	// [["dpi"], []],
	/**
	 * strip_color_profile
	 */
	// [["strip_color_profile"], []],
	// [["scp"], []],
	/**
	 * enforce_thumbnail
	 */
	// [["enforce_thumbnail"], []],
	// [["eth"], []],
	/**
	 * quality
	 */
	// [["quality"], []],
	// [["q"], []],
	/**
	 * format_quality
	 */
	// [["format_quality"], []],
	// [["fq"], []],
	/**
	 * autoquality
	 */
	// [["autoquality"], []],
	// [["aq"], []],
	/**
	 * max_bytes
	 */
	// [["max_bytes"], []],
	// [["mb"], []],
	/**
	 * jpeg_options
	 */
	// [["jpeg_options"], []],
	// [["jpgo"], []],
	/**
	 * png_options
	 */
	// [["png_options"], []],
	// [["pngo"], []],
	/**
	 * webp_options
	 */
	// [["webp_options"], []],
	// [["webpo"], []],
	/**
	 * format
	 */
	// [["format"], []],
	// [["f"], []],
	// [["ext"], []], // alt - format
	/**
	 * page
	 */
	// [["page"], []],
	// [["pg"], []],
	/**
	 * pages
	 */
	// [["pages"], []],
	// [["pgs"], []],
	/**
	 * disable_animation
	 */
	// [["disable_animation"], []],
	// [["da"], []],
	/**
	 * video_thumbnail_second
	 */
	// [["video_thumbnail_second"], []],
	// [["vts"], []],
	/**
	 * video_thumbnail_keyframes
	 */
	// [["video_thumbnail_keyframes"], []],
	// [["vtk"], []],
	/**
	 * video_thumbnail_tile
	 */
	// [["video_thumbnail_tile"], []],
	// [["vtt"], []],
	/**
	 * video_thumbnail_animation
	 */
	// [["video_thumbnail_animation"], []],
	// [["vta"], []],
	/**
	 * fallback_image_url
	 */
	// [["fallback_image_url"], []],
	// [["fiu"], []],
	/**
	 * skip_processing
	 */
	// [["skip_processing"], []],
	// [["skp"], []],
	/**
	 * raw
	 */
	// [["raw"], []],
	// [["raw"], []],
	/**
	 * cache_buster
	 */
	// [["cache_buster"], []],
	// [["cb"], []],
	/**
	 * expires
	 */
	// [["expires"], []],
	// [["exp"], []],
	/**
	 * filename
	 */
	// [["filename"], []],
	// [["fn"], []],
	/**
	 * return_attachment
	 */
	// [["return_attachment"], []],
	// [["att"], []],
	/**
	 * preset
	 */
	// [["preset"], []],
	// [["pr"], []],
	/**
	 * hashsum
	 */
	// [["hashsum"], []],
	// [["hs"], []],
	/**
	 * max_src_resolution
	 */
	// [["max_src_resolution"], []],
	// [["msr"], []],
	/**
	 * max_src_file_size
	 */
	// [["max_src_file_size"], []],
	// [["msfs"], []],
	/**
	 * max_animation_frames
	 */
	// [["max_animation_frames"], []],
	// [["maf"], []],
	/**
	 * max_animation_frame_resolution
	 */
	// [["max_animation_frame_resolution"], []],
	// [["mafr"], []],
];

export const metaOptionTestData = metaOptionRawData.map(([options, expected]) => {
	return _testDataFromOptions(options, expected);
});

export const stdOptionTestData = stdOptionRawData.map(([options, expected]) => {
	return _testDataFromOptions(options, expected);
});
