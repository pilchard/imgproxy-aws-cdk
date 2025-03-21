import { Optimizer } from "@parcel/plugin";

export default new Optimizer({
	async optimize({ contents, map }) {
		const [optimizedContents, sourceMap] = restore_handler_declaration(contents, map);

		return { contents: optimizedContents, map: sourceMap };
	},
});

function restore_handler_declaration(contents, map) {
	let optContents = contents;

	const declarationRegexp = /const ([\w$]+) = async function handler/;

	const [functionDeclaration, handlerAlias] = declarationRegexp.exec(optContents) ?? [];

	if (functionDeclaration !== undefined && handlerAlias !== undefined) {
		optContents = optContents.replace(`const ${handlerAlias} = async function handler`, `async function ${handlerAlias}`);
	}

	return [optContents, map];
}
