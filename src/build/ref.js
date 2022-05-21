const {gatherMany} = require("getdocs-ts")
const {build, browserImports} = require("builddocs")
const {join} = require("path")
const {existsSync, readdirSync, readFileSync} = require("fs")

var root = __dirname + "/../../node_modules/"
if (!existsSync(root + "prosemirror-model"))
  root = __dirname + "/../../../node_modules/"

var packages = ["state", "view", "model", "transform", "commands",
                "history", "collab", "keymap", "inputrules",
                "gapcursor", "schema-basic", "schema-list"]

function findMain(pkg) {
  let base = join(root, "prosemirror-" + pkg)
  let index = join(base, "src", "index.ts")
  return existsSync(index) ? index : join(base, "src", pkg + ".ts")
}

exports.buildRef = function buildRef() {
  if (process.env.NO_REF) return []

  function buildOptions(name) {
    return {
      name,
      anchorPrefix: name + ".",
      allowUnresolvedTypes: false,
      processType: type => {
        if ((type.type == "Node" || type.type == "Selection") && type.typeSource && /dom\.d\.ts/.test(type.typeSource))
          return {...type, type: "DOM" + type.type}
      },
      markdownOptions: {highlight: require("./highlight").highlight},
      breakAt: 45,
      imports: [type => {
        if (type.type == "OrderedMap") return "https://github.com/marijnh/orderedmap#readme"
        if (type.type == "DOMNode") return "https://developer.mozilla.org/en-US/docs/Web/API/Node"
        if (type.type == "DOMSelection") return "https://developer.mozilla.org/en-US/docs/Web/API/Selection"
        let sibling = /\.\.\/([\w-]+)\//.exec(type.typeSource)
        if (sibling && packages.includes(sibling[1])) return "#" + sibling[1] + "." + type.type
      }, browserImports]
    }
  }

  let modules = packages.map(name => ({name, base: join(root, "prosemirror-" + name), main: findMain(name)}))

  let items = gatherMany(modules.map(mod => ({filename: mod.main, basedir: mod.base})))
  let nav = [{name: "Intro", href: "#top.intro"}]
  let output = modules.map((mod, i) => {
    let tocPart = {name: "prosemirror-" + mod.name, href: "#" + mod.name}
    nav.push(tocPart)
    let main = join(mod.main, "../README.md")
    let text = build({...buildOptions(mod.name), main: existsSync(main) ? main : null}, items[i])
    text = text.replace(/<h3>(.*?)<\/h3>/g, function(_, text) {
      let id = mod.name + "." + text.replace(/\W+/g, "_")
      if (!tocPart.sub) tocPart.sub = []
      tocPart.sub.push({name: text, href: "#" + id})
      return `<h3 id="${id}"><a href="#${id}">${text}</a></h3>`
    })
    return {
      name: mod.name,
      text
    }
  })
  return {modules: output, nav}
}
