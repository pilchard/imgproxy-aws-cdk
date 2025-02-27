/**
 * Sync SystemManager and KeyValueStore Parameters
 * 
 * Read-in all files matching glob `<key-subpath>.<type>.env`
 * 
 
const fs = import('node:fs');
const dirCont = fs.readdirSync( cwd );
const files = dirCont.filter( ( elm ) => elm.match(/\..+\.env$/ig));

 * For each matching file:
 * - construct stack specific parameter key path `/${stack-name}/${key-subpath}`
 * 

const 

* - filter keys
 */
