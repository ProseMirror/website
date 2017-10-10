let {readFileSync, writeFileSync, mkdirSync} = require("fs")
let {dirname} = require("path")

let name = process.argv[2]

let input = `example/${name}`
let output = `example/build/prosemirror-example-${name}`

let code = readFileSync(input + "/index.js", "utf8"), html = readFileSync(input + "/index.html", "utf8")
let readme = readFileSync("example/README.md", "utf8")

try { mkdirSync(dirname(output)) } catch(_) {}
try { mkdirSync(output) } catch(_) {}

writeFileSync(output + "/index.html", `<!doctype html>
<meta charset=utf8>
<link rel=stylesheet href="https://prosemirror.net/css/editor.css">
<script src="https://prosemirror.net/examples/prosemirror.js"></script>
<script src="require-pm.js"></script>

<script src="index.js" defer></script>
<base href="http://prosemirror.net/">

${html.replace(/<!--.*?-->\n/g, "")}`)

writeFileSync(output + "/index.js", code.replace(/\bimport \{(.*?)\}\s*from\s*"(.*?)"/g, (_, imports, source) => {
  return `const {${imports.replace(/\s+as\s+/g, ": ")}} = require("${source}")`
}).replace(/\/\/ (\}|\w+\{)\n/g, ""))

writeFileSync(output + "/require-pm.js", `// Kludge to make requiring prosemirror core libraries possible. The
// PM global is defined by http://prosemirror.net/examples/prosemirror.js,
// which bundles all the core libraries.
function require(name) {
  let id = /^prosemirror-(.*)/.exec(name), mod = id && PM[id[1].replace(/-/g, "_")]
  if (!mod) throw new Error(\`Library ${name} isn't loaded\`)
  return mod
}`)

writeFileSync(output + "/README.md", readme.replace(/\{\{NAME}}/g, name))
