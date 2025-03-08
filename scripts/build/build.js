const { build } = require("esbuild");
const { dependencies, peerDependencies } = require("../../package.json");
// const { Generator } = require("npm-dts");

// new Generator({
// 	entry: "src/index.ts",
// 	output: "dist/index.d.ts",
// }).generate();

const sharedConfig = {
	entryPoints: ["functions/url-rewrite/index.ts"],
	bundle: true,
	// minify: true,
	external: ["crypto", "cloudfront"],
	platform: "browser",
	target: ["es2022"],
};
build({
	...sharedConfig,
	platform: "node", // for CJS
	outfile: "dist/index.js",
});
build({
	...sharedConfig,
	outfile: "dist/index.esm.js",
	platform: "neutral", // for ESM
	format: "esm",
});
