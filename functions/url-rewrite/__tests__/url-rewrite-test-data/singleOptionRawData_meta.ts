export const metaOptionRawData: [string, string[], string[]][] = [
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
	["resize", ["resize:fit:100:200:0:0:no:0.1:0.2"], ["rt:fit", "w:100", "h:200", "el:0", "ex:0:no:0.1:0.2"]],
	["resize", ["resize:fill:100:200:1:1:no:0.1:0.2"], ["rt:fill", "w:100", "h:200", "el:1", "ex:1:no:0.1:0.2"]],
	["resize", ["resize:fit:100:200:false:false:noea:1:2"], ["rt:fit", "w:100", "h:200", "el:0", "ex:0:noea:1:2"]],
	["resize", ["resize:fill:100:200:true:true:noea:1:2"], ["rt:fill", "w:100", "h:200", "el:1", "ex:1:noea:1:2"]],
	["resize", ["resize:fill-down:100:200:f:f:ce"], ["rt:fill-down", "w:100", "h:200", "el:0", "ex:0:ce"]],
	["resize", ["resize:auto:100:200:t:t:we:1:0.2"], ["rt:auto", "w:100", "h:200", "el:1", "ex:1:we:1:0.2"]],
	// `rs`
	["rs", ["rs:fit:100:200:0:0:no:0.1:0.2"], ["rt:fit", "w:100", "h:200", "el:0", "ex:0:no:0.1:0.2"]],
	["rs", ["rs:fill:100:200:1:1:no:0.1:0.2"], ["rt:fill", "w:100", "h:200", "el:1", "ex:1:no:0.1:0.2"]],
	["rs", ["rs:fit:100:200:false:false:noea:1:2"], ["rt:fit", "w:100", "h:200", "el:0", "ex:0:noea:1:2"]],
	["rs", ["rs:fill:100:200:true:true:noea:1:2"], ["rt:fill", "w:100", "h:200", "el:1", "ex:1:noea:1:2"]],
	["rs", ["rs:fill-down:100:200:f:f:ce"], ["rt:fill-down", "w:100", "h:200", "el:0", "ex:0:ce"]],
	["rs", ["rs:auto:100:200:t:t:we:1:0.2"], ["rt:auto", "w:100", "h:200", "el:1", "ex:1:we:1:0.2"]],
	// `resize` partial
	["resize -fit", ["resize::100:200:0:0:no:0.1:0.2"], ["w:100", "h:200", "el:0", "ex:0:no:0.1:0.2"]],
	["resize -w", ["resize:fill::200:1:1:no:0.1:0.2"], ["rt:fill", "h:200", "el:1", "ex:1:no:0.1:0.2"]],
	["resize -h", ["resize:fit:100::false:false:noea:1:2"], ["rt:fit", "w:100", "el:0", "ex:0:noea:1:2"]],
	["resize -el", ["resize:fill:100:200::true:noea:1:2"], ["rt:fill", "w:100", "h:200", "ex:1:noea:1:2"]],
	["resize -ex", ["resize:fill-down:100:200:f::ce"], ["rt:fill-down", "w:100", "h:200", "el:0"]],
	// `rs` partial
	["rs -fit", ["rs::100:200:0:0:no:0.1:0.2"], ["w:100", "h:200", "el:0", "ex:0:no:0.1:0.2"]],
	["rs -w", ["rs:fill::200:1:1:no:0.1:0.2"], ["rt:fill", "h:200", "el:1", "ex:1:no:0.1:0.2"]],
	["rs -h", ["rs:fit:100::false:false:noea:1:2"], ["rt:fit", "w:100", "el:0", "ex:0:noea:1:2"]],
	["rs -el", ["rs:fill:100:200::true:noea:1:2"], ["rt:fill", "w:100", "h:200", "ex:1:noea:1:2"]],
	["rs -ex", ["rs:fill-down:100:200:f::ce"], ["rt:fill-down", "w:100", "h:200", "el:0"]],
	/**
	 * Size - meta-option
	 *
	 * size:%width:%height:%enlarge:%extend
	 * s:%width:%height:%enlarge:%extend
	 *
	 * This is a meta-option that defines the width, height, enlarge, and extend. All arguments are optional and can be omitted to use their default values.
	 */
	// `size`
	["size", ["size:100:200:0:0:no:0.1:0.2"], ["w:100", "h:200", "el:0", "ex:0:no:0.1:0.2"]],
	["size", ["size:100:200:1:1:no:0.1:0.2"], ["w:100", "h:200", "el:1", "ex:1:no:0.1:0.2"]],
	["size", ["size:100:200:false:false:noea:1:2"], ["w:100", "h:200", "el:0", "ex:0:noea:1:2"]],
	["size", ["size:100:200:true:true:noea:1:2"], ["w:100", "h:200", "el:1", "ex:1:noea:1:2"]],
	["size", ["size:100:200:f:f:ce"], ["w:100", "h:200", "el:0", "ex:0:ce"]],
	["size", ["size:100:200:t:t:we:1:0.2"], ["w:100", "h:200", "el:1", "ex:1:we:1:0.2"]],
	// `s`
	["s", ["s:100:200:0:0:no:0.1:0.2"], ["w:100", "h:200", "el:0", "ex:0:no:0.1:0.2"]],
	["s", ["s:100:200:1:1:no:0.1:0.2"], ["w:100", "h:200", "el:1", "ex:1:no:0.1:0.2"]],
	["s", ["s:100:200:false:false:noea:1:2"], ["w:100", "h:200", "el:0", "ex:0:noea:1:2"]],
	["s", ["s:100:200:true:true:noea:1:2"], ["w:100", "h:200", "el:1", "ex:1:noea:1:2"]],
	["s", ["s:100:200:f:f:ce"], ["w:100", "h:200", "el:0", "ex:0:ce"]],
	["s", ["s:100:200:t:t:we:1:0.2"], ["w:100", "h:200", "el:1", "ex:1:we:1:0.2"]],
	// `size` partial
	["size -w", ["size::100:0:0:no:0.1:0.2"], ["h:100", "el:0", "ex:0:no:0.1:0.2"]],
	["size -h", ["size:100::0:0:no:0.1:0.2"], ["w:100", "el:0", "ex:0:no:0.1:0.2"]],
	["size -el", ["size:100:200::1:no:0.1:0.2"], ["w:100", "h:200", "ex:1:no:0.1:0.2"]],
	["size -ex", ["size:100:200:false::noea:1:2"], ["w:100", "h:200", "el:0"]],
	["size ex-partial", ["size:100:200:true:true::1:2"], ["w:100", "h:200", "el:1", "ex:1::1:2"]],
	["size ex-partial", ["size:100:200:true:true:ea::2"], ["w:100", "h:200", "el:1", "ex:1:ea::2"]],
	["size ex-partial", ["size:100:200:true:true:ea:1"], ["w:100", "h:200", "el:1", "ex:1:ea:1"]],
	// `s` partial
	["s -h", ["s:100::0:0:no:0.1:0.2"], ["w:100", "el:0", "ex:0:no:0.1:0.2"]],
	["s -el", ["s:100:200::1:no:0.1:0.2"], ["w:100", "h:200", "ex:1:no:0.1:0.2"]],
	["s -ex", ["s:100:200:false::noea:1:2"], ["w:100", "h:200", "el:0"]],
	["s ex-partial", ["s:100:200:true:true::1:2"], ["w:100", "h:200", "el:1", "ex:1::1:2"]],
	["s ex-partial", ["s:100:200:true:true:ea::2"], ["w:100", "h:200", "el:1", "ex:1:ea::2"]],
	["s ex-partial", ["s:100:200:true:true:ea:1"], ["w:100", "h:200", "el:1", "ex:1:ea:1"]],
];
