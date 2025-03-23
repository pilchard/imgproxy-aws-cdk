export const stdOptionRawData: [string, string[], string[]][] = [
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
	["resizing_type", ["resizing_type:fit"], ["rt:fit"]],
	["resizing_type", ["resizing_type:fill"], ["rt:fill"]],
	["resizing_type", ["resizing_type:fill-down"], ["rt:fill-down"]],
	["resizing_type", ["resizing_type:force"], ["rt:force"]],
	["resizing_type", ["resizing_type:auto"], ["rt:auto"]],
	["rt", ["rt:fit"], ["rt:fit"]],
	["rt", ["rt:fill"], ["rt:fill"]],
	["rt", ["rt:fill-down"], ["rt:fill-down"]],
	["rt", ["rt:force"], ["rt:force"]],
	["rt", ["rt:auto"], ["rt:auto"]],
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
	["width", ["width:10"], ["w:10"]],
	["w", ["w:10"], ["w:10"]],
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
	["height", ["height:100"], ["h:100"]],
	["h", ["h:100"], ["h:100"]],
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
	["min_width", ["min_width:100"], ["mw:100"]],
	["mw", ["mw:100"], ["mw:100"]],

	["min_height", ["min_height:100"], ["mh:100"]],
	["mh", ["mh:100"], ["mh:100"]],

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
	["zoom", ["zoom:10"], ["z:10"]],
	["zoom", ["zoom:10:20"], ["z:10:20"]],
	["z", ["z:10"], ["z:10"]],
	["z", ["z:10:20"], ["z:10:20"]],
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
	["dpr", ["dpr:3"], ["dpr:3"]],
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
	["enlarge (false)", ["enlarge:0"], ["el:0"]],
	["enlarge (false)", ["enlarge:f"], ["el:0"]],
	["enlarge (false)", ["enlarge:false"], ["el:0"]],
	["el (false)", ["el:0"], ["el:0"]],
	["el (false)", ["el:f"], ["el:0"]],
	["el (false)", ["el:false"], ["el:0"]],
	// true - valid truthy values: `1`, `t` or `true`
	["enlarge (true)", ["enlarge:1"], ["el:1"]],
	["enlarge (true)", ["enlarge:t"], ["el:1"]],
	["enlarge (true)", ["enlarge:true"], ["el:1"]],
	["el (true)", ["el:1"], ["el:1"]],
	["el (true)", ["el:t"], ["el:1"]],
	["el (true)", ["el:true"], ["el:1"]],
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
	["extend", ["extend:0:no:0.1:0.2"], ["ex:0:no:0.1:0.2"]],
	["extend", ["extend:1:no:0.1:0.2"], ["ex:1:no:0.1:0.2"]],
	["extend", ["extend:false:noea:1:2"], ["ex:0:noea:1:2"]],
	["extend", ["extend:true:noea:1:2"], ["ex:1:noea:1:2"]],
	["extend", ["extend:f:ce"], ["ex:0:ce"]],
	["extend", ["extend:t:we:1:0.2"], ["ex:1:we:1:0.2"]],

	["ex", ["ex:0:no:0.1:0.2"], ["ex:0:no:0.1:0.2"]],
	["ex", ["ex:1:no:0.1:0.2"], ["ex:1:no:0.1:0.2"]],
	["ex", ["ex:false:noea:1:2"], ["ex:0:noea:1:2"]],
	["ex", ["ex:true:noea:1:2"], ["ex:1:noea:1:2"]],
	["ex", ["ex:f:ce"], ["ex:0:ce"]],
	["ex", ["ex:t:we:1:0.2"], ["ex:1:we:1:0.2"]],
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
	["extend_aspect_ratio", ["extend_aspect_ratio:0:no:0.1:0.2"], ["exar:0:no:0.1:0.2"]],
	["extend_aspect_ratio", ["extend_aspect_ratio:1:no:0.1:0.2"], ["exar:1:no:0.1:0.2"]],
	["extend_aspect_ratio", ["extend_aspect_ratio:false:noea:1:2"], ["exar:0:noea:1:2"]],
	["extend_aspect_ratio", ["extend_aspect_ratio:true:noea:1:2"], ["exar:1:noea:1:2"]],
	["extend_aspect_ratio", ["extend_aspect_ratio:f:ce"], ["exar:0:ce"]],
	["extend_aspect_ratio", ["extend_aspect_ratio:t:we:1:0.2"], ["exar:1:we:1:0.2"]],

	["extend_ar", ["extend_ar:0:no:0.1:0.2"], ["exar:0:no:0.1:0.2"]],
	["extend_ar", ["extend_ar:1:no:0.1:0.2"], ["exar:1:no:0.1:0.2"]],
	["extend_ar", ["extend_ar:false:noea:1:2"], ["exar:0:noea:1:2"]],
	["extend_ar", ["extend_ar:true:noea:1:2"], ["exar:1:noea:1:2"]],
	["extend_ar", ["extend_ar:f:ce"], ["exar:0:ce"]],
	["extend_ar", ["extend_ar:t:we:1:0.2"], ["exar:1:we:1:0.2"]],

	["exar", ["exar:0:no:0.1:0.2"], ["exar:0:no:0.1:0.2"]],
	["exar", ["exar:1:no:0.1:0.2"], ["exar:1:no:0.1:0.2"]],
	["exar", ["exar:false:noea:1:2"], ["exar:0:noea:1:2"]],
	["exar", ["exar:true:noea:1:2"], ["exar:1:noea:1:2"]],
	["exar", ["exar:f:ce"], ["exar:0:ce"]],
	["exar", ["exar:t:we:1:0.2"], ["exar:1:we:1:0.2"]],
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
	["gravity", ["gravity:no"], ["g:no"]],
	["gravity", ["gravity:so"], ["g:so"]],
	["gravity", ["gravity:ea"], ["g:ea"]],
	["gravity", ["gravity:we"], ["g:we"]],
	["gravity", ["gravity:noea"], ["g:noea"]],
	["gravity", ["gravity:nowe"], ["g:nowe"]],
	["gravity", ["gravity:soea"], ["g:soea"]],
	["gravity", ["gravity:sowe"], ["g:sowe"]],
	["gravity", ["gravity:ce"], ["g:ce"]],

	["gravity", ["gravity:no:1"], ["g:no:1"]],
	["gravity", ["gravity:so:1"], ["g:so:1"]],
	["gravity", ["gravity:ea:1"], ["g:ea:1"]],
	["gravity", ["gravity:we:1"], ["g:we:1"]],
	["gravity", ["gravity:noea:1"], ["g:noea:1"]],
	["gravity", ["gravity:nowe:1"], ["g:nowe:1"]],
	["gravity", ["gravity:soea:1"], ["g:soea:1"]],
	["gravity", ["gravity:sowe:1"], ["g:sowe:1"]],
	["gravity", ["gravity:ce:1"], ["g:ce:1"]],

	["gravity", ["gravity:no:1:2"], ["g:no:1:2"]],
	["gravity", ["gravity:so:1:2"], ["g:so:1:2"]],
	["gravity", ["gravity:ea:1:2"], ["g:ea:1:2"]],
	["gravity", ["gravity:we:1:2"], ["g:we:1:2"]],
	["gravity", ["gravity:noea:1:2"], ["g:noea:1:2"]],
	["gravity", ["gravity:nowe:1:2"], ["g:nowe:1:2"]],
	["gravity", ["gravity:soea:1:2"], ["g:soea:1:2"]],
	["gravity", ["gravity:sowe:1:2"], ["g:sowe:1:2"]],
	["gravity", ["gravity:ce:1:2"], ["g:ce:1:2"]],

	["gravity", ["gravity:no:0.98:0.12"], ["g:no:0.98:0.12"]],
	["gravity", ["gravity:so:0.98:0.12"], ["g:so:0.98:0.12"]],
	["gravity", ["gravity:ea:0.98:0.12"], ["g:ea:0.98:0.12"]],
	["gravity", ["gravity:we:0.98:0.12"], ["g:we:0.98:0.12"]],
	["gravity", ["gravity:noea:0.98:0.12"], ["g:noea:0.98:0.12"]],
	["gravity", ["gravity:nowe:0.98:0.12"], ["g:nowe:0.98:0.12"]],
	["gravity", ["gravity:soea:0.98:0.12"], ["g:soea:0.98:0.12"]],
	["gravity", ["gravity:sowe:0.98:0.12"], ["g:sowe:0.98:0.12"]],
	["gravity", ["gravity:ce:0.98:0.12"], ["g:ce:0.98:0.12"]],

	["g", ["g:no"], ["g:no"]],
	["g", ["g:so"], ["g:so"]],
	["g", ["g:ea"], ["g:ea"]],
	["g", ["g:we"], ["g:we"]],
	["g", ["g:noea"], ["g:noea"]],
	["g", ["g:nowe"], ["g:nowe"]],
	["g", ["g:soea"], ["g:soea"]],
	["g", ["g:sowe"], ["g:sowe"]],
	["g", ["g:ce"], ["g:ce"]],

	["g", ["g:no:1"], ["g:no:1"]],
	["g", ["g:so:1"], ["g:so:1"]],
	["g", ["g:ea:1"], ["g:ea:1"]],
	["g", ["g:we:1"], ["g:we:1"]],
	["g", ["g:noea:1"], ["g:noea:1"]],
	["g", ["g:nowe:1"], ["g:nowe:1"]],
	["g", ["g:soea:1"], ["g:soea:1"]],
	["g", ["g:sowe:1"], ["g:sowe:1"]],
	["g", ["g:ce:1"], ["g:ce:1"]],

	["g", ["g:no:1:2"], ["g:no:1:2"]],
	["g", ["g:so:1:2"], ["g:so:1:2"]],
	["g", ["g:ea:1:2"], ["g:ea:1:2"]],
	["g", ["g:we:1:2"], ["g:we:1:2"]],
	["g", ["g:noea:1:2"], ["g:noea:1:2"]],
	["g", ["g:nowe:1:2"], ["g:nowe:1:2"]],
	["g", ["g:soea:1:2"], ["g:soea:1:2"]],
	["g", ["g:sowe:1:2"], ["g:sowe:1:2"]],
	["g", ["g:ce:1:2"], ["g:ce:1:2"]],

	["g", ["g:no:0.98:0.12"], ["g:no:0.98:0.12"]],
	["g", ["g:so:0.98:0.12"], ["g:so:0.98:0.12"]],
	["g", ["g:ea:0.98:0.12"], ["g:ea:0.98:0.12"]],
	["g", ["g:we:0.98:0.12"], ["g:we:0.98:0.12"]],
	["g", ["g:noea:0.98:0.12"], ["g:noea:0.98:0.12"]],
	["g", ["g:nowe:0.98:0.12"], ["g:nowe:0.98:0.12"]],
	["g", ["g:soea:0.98:0.12"], ["g:soea:0.98:0.12"]],
	["g", ["g:sowe:0.98:0.12"], ["g:sowe:0.98:0.12"]],
	["g", ["g:ce:0.98:0.12"], ["g:ce:0.98:0.12"]],
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
	["gravity", ["gravity:sm"], ["g:sm"]],
	["g", ["g:sm"], ["g:sm"]],

	["gravity", ["gravity:obj:face:cat:dog"], ["g:obj:face:cat:dog"]],
	["g", ["g:obj:face:cat:dog"], ["g:obj:face:cat:dog"]],

	["gravity", ["gravity:objw:face:2:cat:3:dog:4"], ["g:objw:face:2:cat:3:dog:4"]],
	["gravity", ["gravity:objw:all:2:face:10"], ["g:objw:all:2:face:10"]],
	["g", ["g:objw:face:2:cat:3:dog:4"], ["g:objw:face:2:cat:3:dog:4"]],
	["g", ["g:objw:all:2:face:10"], ["g:objw:all:2:face:10"]],

	["gravity", ["gravity:fp:0.98:0.12"], ["g:fp:0.98:0.12"]],
	["g", ["g:fp:0.98:0.12"], ["g:fp:0.98:0.12"]],
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
	["crop", ["crop:100:200:nowe"], ["c:100:200:nowe"]],
	["c", ["c:100:200:nowe"], ["c:100:200:nowe"]],
	/** @todo implement partial argument updates */
	// ["crop", ["crop:100:200:nowe", "crop:200"], ["c:200:200:nowe"]],
	// ["c", ["c:100:200:nowe", "crop:200"], ["c:200:200:nowe"]],
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
	["trim", ["trim:10:FF00FF:f:t"], ["t:10:ff00ff:0:1"]],
	["trim", ["trim:10:1100ab:f:t"], ["t:10:1100ab:0:1"]],
	["trim", ["trim:10::f:t"], ["t:10::0:1"]],
	["t", ["t:10:1100ab:f:t"], ["t:10:1100ab:0:1"]],
	["t", ["t:10:1100ab:f:t"], ["t:10:1100ab:0:1"]],
	["t", ["t:10::f:t"], ["t:10::0:1"]],
	// ["t", ["t"], []],
	/**
	 * Padding (merge)
	 * padding:%top:%right:%bottom:%left
	 * pd:%top:%right:%bottom:%left
	 */
	["padding", ["padding:10"], ["pd:10"]],
	["padding", ["padding:10:20"], ["pd:10:20"]],
	["padding", ["padding:10:20:30"], ["pd:10:20:30"]],
	["padding", ["padding:10:20:30:40"], ["pd:10:20:30:40"]],
	["pd", ["pd:10"], ["pd:10"]],
	["pd", ["pd:10:20"], ["pd:10:20"]],
	["pd", ["pd:10:20:30"], ["pd:10:20:30"]],
	["pd", ["pd:10:20:30:40"], ["pd:10:20:30:40"]],

	["padding", ["padding:10", "padding:10:20", "padding:10:20:30", "padding:10:20:30:40"], ["pd:10:20:30:40"]],
	["padding", ["padding:10", "padding::20", "padding:::30", "padding::::40"], ["pd:10:20:30:40"]],
	["padding", ["padding:10:::", "padding::20::", "padding:::30:", "padding::::40"], ["pd:10:20:30:40"]],
	["padding", ["padding:::30:", "padding::::40", "padding:10:::", "padding::20::"], ["pd:10:20:30:40"]],
	["padding", ["padding:10:20:30:40", "padding:10:20:30", "padding:10:20", "padding:10"], ["pd:10:20:30:40"]],
	["padding", ["pd::::40", "padding:::30", "pd::20", "padding:10"], ["pd:10:20:30:40"]],
	["padding", ["padding::::40", "padding:::30:", "padding::20::", "padding:10:::"], ["pd:10:20:30:40"]],

	["pd", ["pd:10", "pd:10:20", "pd:10:20:30", "pd:10:20:30:40"], ["pd:10:20:30:40"]],
	["pd", ["pd:10", "pd::20", "pd:::30", "pd::::40"], ["pd:10:20:30:40"]],
	["pd", ["pd:10:::", "pd::20::", "pd:::30:", "pd::::40"], ["pd:10:20:30:40"]],
	["pd", ["pd:::30:", "pd::::40", "pd:10:::", "pd::20::"], ["pd:10:20:30:40"]],
	["pd", ["pd:10:20:30:40", "pd:10:20:30", "pd:10:20", "pd:10"], ["pd:10:20:30:40"]],
	["pd", ["pd::::40", "pd:::30", "pd::20", "pd:10"], ["pd:10:20:30:40"]],
	["pd", ["pd::::40", "pd:::30:", "pd::20::", "pd:10:::"], ["pd:10:20:30:40"]],
	/**
	 * auto_rotate
	 */
	// false
	["auto_rotate (false)", ["auto_rotate:0"], ["ar:0"]],
	["auto_rotate (false)", ["auto_rotate:f"], ["ar:0"]],
	["auto_rotate (false)", ["auto_rotate:false"], ["ar:0"]],
	["ar (false)", ["ar:0"], ["ar:0"]],
	["ar (false)", ["ar:f"], ["ar:0"]],
	["ar (false)", ["ar:false"], ["ar:0"]],
	// true - valid truthy values: `1`, `t` or `true`
	["auto_rotate (true)", ["auto_rotate:1"], ["ar:1"]],
	["auto_rotate (true)", ["auto_rotate:t"], ["ar:1"]],
	["auto_rotate (true)", ["auto_rotate:true"], ["ar:1"]],
	["ar (true)", ["ar:1"], ["ar:1"]],
	["ar (true)", ["ar:t"], ["ar:1"]],
	["ar (true)", ["ar:true"], ["ar:1"]],
	/**
	 * Rotate
	 * rotate:%angle
	 * rot:%angle
	 *
	 * Rotates the image on the specified angle. The orientation from the image metadata is applied before the rotation unless autorotation is disabled.
	 *
	 * ___info___
	 * Only 0, 90, 180, 270, etc., degree angles are supported.
	 */
	["rotate", ["rotate:0"], ["rot:0"]],
	["rotate", ["rotate:270"], ["rot:270"]],
	["rot", ["rot:90"], ["rot:90"]],
	["rot", ["rot:180"], ["rot:180"]],
	/**
	 * Background
	 * background:%R:%G:%B
	 * bg:%R:%G:%B
	 *
	 * background:%hex_color
	 * bg:%hex_color
	 */
	["background", ["background:125:126:127"], ["bg:125:126:127"]],
	["bg", ["bg:125:126:127"], ["bg:125:126:127"]],
	["background", ["background:1133ff"], ["bg:1133ff"]],
	["bg", ["bg:1133ff"], ["bg:1133ff"]],
	/**
	 * Blur
	 * blur:%sigma
	 * bl:%sigma
	 *
	 * When set, imgproxy will apply a gaussian blur filter to the resulting image. The value of
	 * sigma defines the size of the mask imgproxy will use.
	 */
	["blur", ["blur:3"], ["bl:3"]],
	["bl", ["bl:3"], ["bl:3"]],
	/**
	 * Sharpen
	 * sharpen:%sigma
	 * sh:%sigma
	 *
	 * When set, imgproxy will apply the sharpen filter to the resulting image. The value of sigma
	 * defines the size of the mask imgproxy will use.
	 *
	 * As an approximate guideline, use 0.5 sigma for 4 pixels/mm (display resolution),
	 * 1.0 for 12 pixels/mm and 1.5 for 16 pixels/mm (300 dpi == 12 pixels/mm).
	 */
	["sharpen", ["sharpen:1.25"], ["sh:1.25"]],
	["sh", ["sh:1.25"], ["sh:1.25"]],
	/**
	 * Pixelate
	 * pixelate:%size
	 * pix:%size
	 */
	["pixelate", ["pixelate:30"], ["pix:30"]],
	["pix", ["pix:30"], ["pix:30"]],
	/**
	 * Watermark (merge)
	 * watermark:%opacity:%position:%x_offset:%y_offset:%scale
	 * wm:%opacity:%position:%x_offset:%y_offset:%scale
	 *
	 * Places a watermark on the processed image.
	 *
	 * - opacity: watermark opacity modifier. Final opacity is calculated as `base_opacity * opacity`.
	 * - position: (optional) specifies the position of the watermark. Available values:
	 *   - ce: (default) center
	 *   - no: north (top edge)
	 *   - so: south (bottom edge)
	 *   - ea: east (right edge)
	 *   - we: west (left edge)
	 *   - noea: north-east (top-right corner)
	 *   - nowe: north-west (top-left corner)
	 *   - soea: south-east (bottom-right corner)
	 *   - sowe: south-west (bottom-left corner)
	 *   - re: repeat and tile the watermark to fill the entire image
	 *   - ch: pro same as re but watermarks are placed in a chessboard order
	 * - x_offset, y_offset - (optional) specify watermark offset by X and Y axes:
	 *   - When x_offset or y_offset is greater than or equal to 1 or less than or equal to -1,
	 * 			imgproxy treats it as an absolute value.
	 *   - When x_offset or y_offset is less than 1 and greater than -1, imgproxy treats it as a
	 * 			relative value.
	 *   - When using re or ch position, these values define the spacing between the tiles.
	 * - scale: (optional) a floating-point number that defines the watermark size relative to the
	 * 		resultant image size. When set to 0 or when omitted, the watermark size won't be changed.
	 */
	["watermark", ["watermark:0.2"], ["wm:0.2"]],
	["watermark", ["watermark:0.2:ce"], ["wm:0.2:ce"]],
	["watermark", ["watermark:0.2:ce:-10"], ["wm:0.2:ce:-10"]],
	["watermark", ["watermark:0.2:ce:-10:10"], ["wm:0.2:ce:-10:10"]],
	["watermark", ["watermark:0.2:ce:-10:10:0.3"], ["wm:0.2:ce:-10:10:0.3"]],
	["watermark", ["watermark:0.2:ce:-10:10", "watermark:0.2:ce::20"], ["wm:0.2:ce:-10:20"]],
	["watermark", ["watermark:0.2:ce:-10:10", "watermark:0.2:we"], ["wm:0.2:we:-10:10"]],
	["watermark", ["watermark:0.2:ce:-10:10", "watermark:0.2:we:::0.3"], ["wm:0.2:we:-10:10:0.3"]],
	["wm", ["wm:0.2"], ["wm:0.2"]],
	["wm", ["wm:0.2:ce"], ["wm:0.2:ce"]],
	["wm", ["wm:0.2:ce:-10"], ["wm:0.2:ce:-10"]],
	["wm", ["wm:0.2:ce:-10:10"], ["wm:0.2:ce:-10:10"]],
	["wm", ["wm:0.2:ce:-10:10:0.3"], ["wm:0.2:ce:-10:10:0.3"]],
	["wm", ["wm:0.2:ce:-10:10", "wm:0.2:ce::20"], ["wm:0.2:ce:-10:20"]],
	["wm", ["wm:0.2:ce:-10:10", "wm:0.2:we"], ["wm:0.2:we:-10:10"]],
	["wm", ["wm:0.2:ce:-10:10", "wm:0.2:we:::0.3"], ["wm:0.2:we:-10:10:0.3"]],
	/**
	 * strip_metadata
	 */
	// false
	["strip_metadata (false)", ["strip_metadata:0"], ["sm:0"]],
	["strip_metadata (false)", ["strip_metadata:f"], ["sm:0"]],
	["strip_metadata (false)", ["strip_metadata:false"], ["sm:0"]],
	["sm (false)", ["sm:0"], ["sm:0"]],
	["sm (false)", ["sm:f"], ["sm:0"]],
	["sm (false)", ["sm:false"], ["sm:0"]],
	// true - valid truthy values: `1`, `t` or `true`
	["strip_metadata (true)", ["strip_metadata:1"], ["sm:1"]],
	["strip_metadata (true)", ["strip_metadata:t"], ["sm:1"]],
	["strip_metadata (true)", ["strip_metadata:true"], ["sm:1"]],
	["sm (true)", ["sm:1"], ["sm:1"]],
	["sm (true)", ["sm:t"], ["sm:1"]],
	["sm (true)", ["sm:true"], ["sm:1"]],
	/**
	 * keep_copyright
	 */
	// false - valid falsy values: `0`, `f` or `false`
	["keep_copyright (false)", ["keep_copyright:0"], ["kcr:0"]],
	["keep_copyright (false)", ["keep_copyright:f"], ["kcr:0"]],
	["keep_copyright (false)", ["keep_copyright:false"], ["kcr:0"]],
	["kcr (false)", ["kcr:0"], ["kcr:0"]],
	["kcr (false)", ["kcr:f"], ["kcr:0"]],
	["kcr (false)", ["kcr:false"], ["kcr:0"]],
	// true - valid truthy values: `1`, `t` or `true`
	["keep_copyright (true)", ["keep_copyright:1"], ["kcr:1"]],
	["keep_copyright (true)", ["keep_copyright:t"], ["kcr:1"]],
	["keep_copyright (true)", ["keep_copyright:true"], ["kcr:1"]],
	["kcr (true)", ["kcr:1"], ["kcr:1"]],
	["kcr (true)", ["kcr:t"], ["kcr:1"]],
	["kcr (true)", ["kcr:true"], ["kcr:1"]],
	/**
	 * strip_color_profile
	 */
	// false
	["strip_color_profile (false)", ["strip_color_profile:0"], ["scp:0"]],
	["strip_color_profile (false)", ["strip_color_profile:f"], ["scp:0"]],
	["strip_color_profile (false)", ["strip_color_profile:false"], ["scp:0"]],
	["scp (false)", ["scp:0"], ["scp:0"]],
	["scp (false)", ["scp:f"], ["scp:0"]],
	["scp (false)", ["scp:false"], ["scp:0"]],
	// true - valid truthy values: `1`, `t` or `true`
	["strip_color_profile (true)", ["strip_color_profile:1"], ["scp:1"]],
	["strip_color_profile (true)", ["strip_color_profile:t"], ["scp:1"]],
	["strip_color_profile (true)", ["strip_color_profile:true"], ["scp:1"]],
	["scp (true)", ["scp:1"], ["scp:1"]],
	["scp (true)", ["scp:t"], ["scp:1"]],
	["scp (true)", ["scp:true"], ["scp:1"]],
	/**
	 * enforce_thumbnail
	 */
	// false
	["enforce_thumbnail (false)", ["enforce_thumbnail:0"], ["eth:0"]],
	["enforce_thumbnail (false)", ["enforce_thumbnail:f"], ["eth:0"]],
	["enforce_thumbnail (false)", ["enforce_thumbnail:false"], ["eth:0"]],
	["eth (false)", ["eth:0"], ["eth:0"]],
	["eth (false)", ["eth:f"], ["eth:0"]],
	["eth (false)", ["eth:false"], ["eth:0"]],
	// true - valid truthy values: `1`, `t` or `true`
	["enforce_thumbnail (true)", ["enforce_thumbnail:1"], ["eth:1"]],
	["enforce_thumbnail (true)", ["enforce_thumbnail:t"], ["eth:1"]],
	["enforce_thumbnail (true)", ["enforce_thumbnail:true"], ["eth:1"]],
	["eth (true)", ["eth:1"], ["eth:1"]],
	["eth (true)", ["eth:t"], ["eth:1"]],
	["eth (true)", ["eth:true"], ["eth:1"]],
	/**
	 * Quality
	 * quality:%quality
	 * q:%quality
	 *
	 * Redefines quality of the resulting image, as a percentage. When set to 0, quality is assumed
	 * based on IMGPROXY_QUALITY and format_quality.
	 *
	 * @default: 0.
	 */
	["quality", ["quality:80"], ["q:80"]],
	["q", ["q:80"], ["q:80"]],
	/**
	 * Format quality (concat)
	 * format_quality:%format1:%quality1:%format2:%quality2:...:%formatN:%qualityN
	 * fq:%format1:%quality1:%format2:%quality2:...:%formatN:%qualityN
	 *
	 * Adds or redefines IMGPROXY_FORMAT_QUALITY values.
	 */
	["format_quality", ["format_quality:jpeg:70:webp:80"], ["fq:jpeg:70:webp:80"]],
	["format_quality", ["format_quality:jpeg:70:webp:80", "format_quality:png:80"], ["fq:jpeg:70:webp:80:png:80"]],
	["fq", ["fq:jpeg:70:webp:80"], ["fq:jpeg:70:webp:80"]],
	["fq", ["fq:jpeg:70:webp:80", "format_quality:png:80"], ["fq:jpeg:70:webp:80:png:80"]],
	/**
	 * Max bytes
	 * max_bytes:%bytes
	 * mb:%bytes
	 *
	 * When set, imgproxy automatically degrades the quality of the image until the image size is
	 * under the specified amount of bytes.
	 *
	 * ___info___
	 * Applicable only to jpg, webp, heic, and tiff.
	 *
	 * ___warning___
	 * When max_bytes is set, imgproxy saves image multiple times to achieve the specified image size.
	 */
	["max_bytes", ["max_bytes:34000"], ["mb:34000"]],
	["mb", ["mb:34000"], ["mb:34000"]],
	/**
	 * format
	 */
	["format", ["format:jpg"], ["f:jpg"]],
	["format", ["format:jpg"], ["f:jpg"]],
	["ext", ["ext:jpg"], ["f:jpg"]],
	["ext", ["ext:jpg"], ["f:jpg"]],
	["f", ["f:jpg"], ["f:jpg"]],
	["f", ["f:jpg"], ["f:jpg"]],
	/**
	 * Skip processing (concat)
	 * skip_processing:%extension1:%extension2:...:%extensionN
	 * skp:%extension1:%extension2:...:%extensionN
	 */
	["skip_processing", ["skip_processing:webp:jpg"], ["skp:webp:jpg"]],
	["skip_processing", ["skip_processing:webp:jpg", "skip_processing:png"], ["skp:webp:jpg:png"]],
	["skp", ["skp:webp:jpg"], ["skp:webp:jpg"]],
	["skp", ["skp:webp:jpg", "skp:png"], ["skp:webp:jpg:png"]],
	/**
	 * raw
	 */
	// false - valid falsy values: `0`, `f` or `false`
	["raw (false)", ["raw:0"], ["raw:0"]],
	["raw (false)", ["raw:f"], ["raw:0"]],
	["raw (false)", ["raw:false"], ["raw:0"]],
	// true - valid truthy values: `1`, `t` or `true`
	["raw (true)", ["raw:1"], ["raw:1"]],
	["raw (true)", ["raw:t"], ["raw:1"]],
	["raw (true)", ["raw:true"], ["raw:1"]],
	/**
	 * Cache buster
	 * cachebuster:%string
	 * cb:%string
	 */
	["cache_buster", ["cache_buster:random$string_"], ["cb:random$string_"]],
	["cb", ["cb:random$string_"], ["cb:random$string_"]],
	/**
	 * Expires (unix timestamp in seconds)
	 * expires:%timestamp
	 * exp:%timestamp
	 */
	["expires", ["expires:1742720073"], ["exp:1742720073"]],
	["exp", ["exp:1742720073"], ["exp:1742720073"]],
	/**
	 * Filename
	 * filename:%filename:%encoded
	 * fn:%filename:%encoded
	 *
	 * Defines a filename for the Content-Disposition header. When not specified, imgproxy will get
	 * the filename from the source URL.
	 *
	 * filename: escaped or URL-safe Base64-encoded filename to be used in the Content-Disposition
	 * 		header
	 * encoded: (optional) identifies if filename is Base64-encoded. Set it to 1, t, or true if you
	 * 		encoded the filename value with URL-safe Base64 encoding.
	 */
	["filename", ["filename:file_name.jpg"], ["fn:file_name.jpg"]],
	["fn", ["fn:file_name.jpg"], ["fn:file_name.jpg"]],
	["filename", ["filename:fila%20name.jpg"], ["fn:fila%20name.jpg"]],
	["fn", ["fn:fila%20name.jpg"], ["fn:fila%20name.jpg"]],
	["filename", ["filename:ZmlsZV9uYW1lLmpwZw:1"], ["fn:ZmlsZV9uYW1lLmpwZw:1"]],
	["filename", ["filename:ZmlsZV9uYW1lLmpwZw:t"], ["fn:ZmlsZV9uYW1lLmpwZw:1"]],
	["filename", ["filename:ZmlsZV9uYW1lLmpwZw:true"], ["fn:ZmlsZV9uYW1lLmpwZw:1"]],
	["fn", ["fn:ZmlsZV9uYW1lLmpwZw:1"], ["fn:ZmlsZV9uYW1lLmpwZw:1"]],
	["fn", ["fn:ZmlsZV9uYW1lLmpwZw:t"], ["fn:ZmlsZV9uYW1lLmpwZw:1"]],
	["fn", ["fn:ZmlsZV9uYW1lLmpwZw:true"], ["fn:ZmlsZV9uYW1lLmpwZw:1"]],
	/**
	 * return_attachment
	 */
	// false
	["return_attachment (false)", ["return_attachment:0"], ["att:0"]],
	["return_attachment (false)", ["return_attachment:f"], ["att:0"]],
	["return_attachment (false)", ["return_attachment:false"], ["att:0"]],
	["att (false)", ["att:0"], ["att:0"]],
	["att (false)", ["att:f"], ["att:0"]],
	["att (false)", ["att:false"], ["att:0"]],
	// true - valid truthy values: `1`, `t` or `true`
	["return_attachment (true)", ["return_attachment:1"], ["att:1"]],
	["return_attachment (true)", ["return_attachment:t"], ["att:1"]],
	["return_attachment (true)", ["return_attachment:true"], ["att:1"]],
	["att (true)", ["att:1"], ["att:1"]],
	["att (true)", ["att:t"], ["att:1"]],
	["att (true)", ["att:true"], ["att:1"]],
	/**
	 * preset
	 */
	["preset", ["preset:preset1:preset2"], ["pr:preset1:preset2"]],
	["preset", ["preset:preset1:preset2", "preset:preset3"], ["pr:preset1:preset2:preset3"]],
	["pr", ["pr:preset1:preset2"], ["pr:preset1:preset2"]],
	["pr", ["w:100", "pr:preset1:preset2", "preset:preset3", "att:0"], [
		"w:100",
		"pr:preset1:preset2:preset3",
		"att:0",
	]],
	/**
	 * Max src resolution
	 * max_src_resolution:%resolution
	 * msr:%resolution
	 *
	 * Allows redefining IMGPROXY_MAX_SRC_RESOLUTION config.
	 *
	 * __warning__
	 * Since this option allows redefining a security restriction, its usage is not allowed unless
	 * the IMGPROXY_ALLOW_SECURITY_OPTIONS config is set to true.
	 */
	["max_src_resolution", ["max_src_resolution:45"], ["msr:45"]],
	["msr", ["msr:45"], ["msr:45"]],
	/**
	 * Max src file size
	 * max_src_file_size:%size
	 * msfs:%size
	 *
	 * Allows redefining IMGPROXY_MAX_SRC_FILE_SIZE config.
	 *
	 * ___warning___
	 * Since this option allows redefining a security restriction, its usage is not allowed unless
	 * the IMGPROXY_ALLOW_SECURITY_OPTIONS config is set to true.
	 */
	["max_src_file_size", ["max_src_file_size:30000"], ["msfs:30000"]],
	["msfs", ["msfs:30000"], ["msfs:30000"]],
	/**
	 * Max animation frames
	 * max_animation_frames:%size
	 * maf:%size
	 *
	 * Allows redefining IMGPROXY_MAX_ANIMATION_FRAMES config.
	 *
	 * ___warning___
	 * Since this option allows redefining a security restriction, its usage is not allowed unless
	 * the IMGPROXY_ALLOW_SECURITY_OPTIONS config is set to true.
	 */
	["max_animation_frames", ["max_animation_frames:3"], ["maf:3"]],
	["maf", ["maf:3"], ["maf:3"]],
	/**
	 * Max animation frame resolution
	 * max_animation_frame_resolution:%size
	 * mafr:%size
	 *
	 * Allows redefining IMGPROXY_MAX_ANIMATION_FRAME_RESOLUTION config.
	 *
	 * ___warning___
	 * Since this option allows redefining a security restriction, its usage is not allowed unless
	 * the IMGPROXY_ALLOW_SECURITY_OPTIONS config is set to true.
	 */
	["max_animation_frame_resolution", ["max_animation_frame_resolution:30"], ["mafr:30"]],
	["mafr", ["mafr:30"], ["mafr:30"]],
];
