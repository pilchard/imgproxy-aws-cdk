import { Optimizer } from '@parcel/plugin';

export default new Optimizer({
  async optimize({ contents, map }) {
    const [optimizedContents, sourceMap] = restore_handler(contents, map)

    return {
      contents: optimizedContents,
      map: sourceMap
    };
  }
});

function restore_handler(contents, map) {
  let optContents = contents

  const exportRegexp = /export[^\w]*\{[^\w]*([\w$]+)[^\w]+as[^\w]+handler[^\w]*\}\;?/gm;

  const [exportDeclaration, handlerAlias] = exportRegexp.exec(optContents) ?? [];

  if (exportDeclaration !== undefined && handlerAlias !== undefined) {
    optContents = optContents.replace(exportDeclaration, "");
    optContents = optContents.replace(`function ${handlerAlias}`, "function handler");
  }

  return [optContents, map]
}