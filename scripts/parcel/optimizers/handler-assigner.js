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

	console.log({ functionDeclaration, handlerAlias });

	if (functionDeclaration !== undefined && handlerAlias !== undefined) {
		optContents = optContents.replace(`const ${handlerAlias} = async function handler`, `async function ${handlerAlias}`);
	}

	optContents = optContents.replace(/const .+\= async function handler\(event\) \{/i, "export async function handler(event) {");
	console.log(optContents);
	return [optContents, map];
}
