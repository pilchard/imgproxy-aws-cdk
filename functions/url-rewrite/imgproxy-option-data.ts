import { writeFileSync } from "node:fs";
// import type { MergeAction, MergeOptions } from ".";

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

export function writeOptionsToJson() {
	const [indexedOptions, optionPriority] = indexOptions(imgproxyProcessingOptions);
	writeFileSync("./functions/url-rewrite/imgproxy-indexed-options.json", JSON.stringify(indexedOptions), "utf8");
	writeFileSync("./functions/url-rewrite/imgproxy-option-priority.json", JSON.stringify(optionPriority), "utf8");
}

export function indexOptions(optionsArr: ImgproxyOption[]): [Record<string, ImgproxyOption>, string[]] {
	const indexedOptions: Record<string, ImgproxyOption> = {};
	const optionPriority: string[] = [];
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
