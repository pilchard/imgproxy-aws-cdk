/**
 * @see https://medium.com/@o.hanhaliuk/building-testable-cloudfront-functions-with-typescript-3258e0fca6f4
 * @fix https://github.com/itsdouges/typescript-transformer-handbook/blob/master/example-transformers/remove-node/transformer.ts
 */
import * as ts from "typescript";

export const removeExportTransformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
	return (sourceFile) => {
		const visitor: ts.Visitor = (node) => {
			if (ts.isModifier(node) && node.kind === ts.SyntaxKind.ExportKeyword) {
				return undefined;
			}
			return ts.visitEachChild(node, visitor, context);
		};

		const sourceFileVisitor = (sourceFile: ts.SourceFile): ts.SourceFile => {
			return ts.visitEachChild(sourceFile, visitor, context);
		};

		return ts.visitNode(sourceFile, sourceFileVisitor, ts.isSourceFile);
	};
};
