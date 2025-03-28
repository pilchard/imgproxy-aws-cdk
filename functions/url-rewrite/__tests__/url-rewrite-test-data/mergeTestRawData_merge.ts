export const mergeMergeTestRawData: [string, string[], string[]][] = [
	["merge - g/g/g", ["g:ea", "gravity:no:0.98:0.12", "g:we::1"], ["g:ea", "g:no:0.98:0.12", "g:we::1"]],
	["merge - g/pr/g", ["gravity:no:0.98:0.12", "pr:square", "g:ea", "pr:round", "g:sm", "g:noea:0:0"], [
		"g:no:0.98:0.12",
		"pr:square",
		"g:ea",
		"pr:round",
		"g:sm",
		"g:noea:0:0",
	]],
	/**
	 * @todo
	 * [] - track overwrting `gravity` options
	 */
	["merge - g/pr/g/pr/g:sm", ["gravity:no:0.98:0.12", "pr:square", "g:ea", "pr:round", "g:sm", "g:noea:0:0"], [
		"g:no:0.98:0.12",
		"pr:square",
		"g:ea",
		"pr:round",
		"g:sm",
		"g:noea:0:0",
	]],
	[
		"merge - g/pr/g/pr/g:sm",
		["gravity:no:0.98:0.12", "pr:square", "g:ea", "pr:round", "g:sm", "g:noea:0:0", "g:fp"],
		["g:no:0.98:0.12", "pr:square", "g:ea", "pr:round", "g:sm", "g:noea:0:0", "g:fp"],
	],
	/**
	 * @todo
	 * [] - concat `preset` after partitioning
	 */
	["merge - g/pr/g/pr/g:sm", ["gravity:no:0.98:0.12", "pr:square", "g:ea", "pr:round", "g:sm"], [
		"g:no:0.98:0.12",
		"pr:square",
		"g:ea",
		"pr:round",
		"g:sm",
	]],
];
