/**
 * @see https://medium.com/@o.hanhaliuk/building-testable-cloudfront-functions-with-typescript-3258e0fca6f4
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";
import { removeExportTransformer } from "./removeExportTransformer";

const compilerOptions: ts.CompilerOptions = {
	module: ts.ModuleKind.ES2020,
	target: ts.ScriptTarget.ES2020,
	strict: true,
	removeComments: true,
	lib: ["es2020"],
};

function transpileFile(filePath: string) {
	const source = fs.readFileSync(filePath, "utf-8");
	const result = ts.transpileModule(source, { compilerOptions, transformers: { before: [removeExportTransformer] } });
	const outputFilePath = filePath.replace(".ts", ".js");
	fs.writeFileSync(outputFilePath, result.outputText);
}

transpileFile("./functions/url-rewrite/index.ts");

// const files = fs.readdirSync("./src").filter((file) => file.endsWith(".ts"));
// for (const file of files) {
// 	transpileFile(path.join("./src", file));
// }
