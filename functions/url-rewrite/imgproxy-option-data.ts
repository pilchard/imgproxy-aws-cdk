import { writeFileSync } from "node:fs";

export interface ImgproxyStdOption {
	full: string;
	short: string;
	alt?: string;
	pro?: boolean;
	pkl?: "full" | "short" | "alt";
	bool?: boolean;
	meta?: boolean;
}
export interface ImgproxyMetaOption extends ImgproxyStdOption {
	meta: true;
	metaOptions: string[];
}
export type ImgproxyOption = ImgproxyStdOption | ImgproxyMetaOption;

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
	{ full: "enlarge", short: "el", bool: true },
	{ full: "extend", short: "ex", bool: true },
	{ full: "extend_aspect_ratio", short: "exar", alt: "extend_ar", bool: true },
	{ full: "gravity", short: "g" },
	{ full: "objects_position", short: "op", alt: "obj_pos", pro: true },
	{ full: "crop", short: "c" },
	{ full: "trim", short: "t" },
	{ full: "padding", short: "pd" },
	{ full: "auto_rotate", short: "ar", bool: true },
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
	{ full: "draw_detections", short: "dd", pro: true, bool: true },
	{ full: "colorize", short: "col", pro: true },
	{ full: "gradient", short: "gr", pro: true },
	{ full: "watermark", short: "wm" },
	{ full: "watermark_url", short: "wmu", pro: true },
	{ full: "watermark_text", short: "wmt", pro: true },
	{ full: "watermark_size", short: "wms", pro: true },
	{ full: "watermark_rotate", short: "wmr", alt: "wm_rot", pro: true },
	{ full: "watermark_shadow", short: "wmsh", pro: true },
	{ full: "style", short: "st", pro: true },
	{ full: "strip_metadata", short: "sm", bool: true },
	{ full: "keep_copyright", short: "kcr", bool: true },
	{ full: "dpi", short: "dpi", pro: true },
	{ full: "strip_color_profile", short: "scp", bool: true },
	{ full: "enforce_thumbnail", short: "eth", bool: true },
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
	{ full: "disable_animation", short: "da", pro: true, bool: true },
	{ full: "video_thumbnail_second", short: "vts", pro: true },
	{ full: "video_thumbnail_keyframes", short: "vtk", pro: true },
	{ full: "video_thumbnail_tile", short: "vtt", pro: true },
	{ full: "video_thumbnail_animation", short: "vta", pro: true },
	{ full: "fallback_image_url", short: "fiu", pro: true },
	{ full: "skip_processing", short: "skp" },
	{ full: "raw", short: "raw", bool: true },
	{ full: "cache_buster", short: "cb" },
	{ full: "expires", short: "exp" },
	{ full: "filename", short: "fn" },
	{ full: "return_attachment", short: "att", bool: true },
	{ full: "preset", short: "pr" },
	{ full: "hashsum", short: "hs", pro: true },
	{ full: "max_src_resolution", short: "msr" },
	{ full: "max_src_file_size", short: "msfs" },
	{ full: "max_animation_frames", short: "maf" },
	{ full: "max_animation_frame_resolution", short: "mafr" },
];

export function writeOptionsToJson() {
	const [indexedOptions, optionPriority] = indexOptions(imgproxyProcessingOptions);
	writeFileSync("./functions/url-rewrite/imgproxy-indexed-options.json", JSON.stringify(indexedOptions), "utf8");
	writeFileSync("./functions/url-rewrite/imgproxy-option-priority.json", JSON.stringify(optionPriority), "utf8");
}

export function indexOptions(optionsArr: ImgproxyOption[]): [Record<string, ImgproxyOption>, string[]] {
	const indexedOptions: Record<string, ImgproxyOption> = {};
	const optionPriority: string[] = [];
	// biome-ignore lint/complexity/noForEach: <explanation>
	for (let i = 0; i < optionsArr.length; i++) {
		const option = optionsArr[i];
		optionPriority.push(option.short);
		const labelKeys = ["full", "short", "alt"] as const;
		for (let j = 0; j < labelKeys.length; j++) {
			const indexKey = option[labelKeys[j]];
			if (indexKey !== undefined) {
				indexedOptions[indexKey] = option;
			}
		}
	}

	return [indexedOptions, optionPriority];
}

export default indexOptions(imgproxyProcessingOptions);
