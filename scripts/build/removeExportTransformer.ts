import ts from "typescript";

export const removeExportTransformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
	return (sourceFile) => {
		const visitor: ts.Visitor = (node) => {
			if (ts.isFunctionDeclaration(node)) {
				return ts.visitEachChild(node, visitor, context);
			}
			if (node.kind === ts.SyntaxKind.ExportKeyword) {
				console.log(node);
				return undefined;
			}
			return node;
		};
		return ts.visitEachChild(sourceFile, visitor, context);
	};
};
