var fs = require("fs")
var glob = require("glob")
var getdocs = require("getdocs")
var builddocs = require("builddocs")

var sourceDir = __dirname + "/../../node_modules/prosemirror/"

var modules = [{
  name: "state",
  files: sourceDir + "src/state/*.js",
  order: "index state selection transform",
  deps: ["model", "transform", "view"]
}, {
  name: "view",
  files: sourceDir + "src/view/*.js",
  order: "index",
  deps: ["state"]
}, {
  name: "model",
  files: sourceDir + "src/model/*.js",
  order: "index node fragment mark replace resolvedpos schema content"
}, {
  name: "transform",
  files: sourceDir + "src/transform/*.js",
  order: "index step mark_step replace_step map transform mark replace structure",
  deps: ["model"]
}, {
  name: "commands",
  files: sourceDir + "src/commands/*.js",
  deps: ["state"]
}, {
  name: "history",
  files: sourceDir + "src/history/*.js",
  deps: ["state"]
}, {
  name: "collab",
  files: sourceDir + "src/collab/*.js",
  deps: ["state"]
}, {
  name: "keymap",
  files: sourceDir + "src/keymap/*.js",
  deps: ["state"]
}, {
  name: "inputrules",
  files: sourceDir + "src/inputrules/*.js",
  order: "index inputrules rules util",
  deps: ["state"]
}, {
  name: "schema-basic",
  files: sourceDir + "src/schema-basic/*.js",
  deps: ["model"]
}, {
  name: "schema-list",
  files: sourceDir + "src/schema-list/*.js",
  deps: ["state"]
}, {
  name: "schema-table",
  files: sourceDir + "src/schema-table/*.js",
  deps: ["state"]
}]

let read = Object.create(null)
modules.forEach(config => read[config.name] = builddocs.read(config))

let imports = Object.create(null)

function getImport(name) {
  let found = imports[name]
  if (!found) {
    found = imports[name] = Object.create(null)
    for (let prop in read[name].all)
      found[prop] = "#" + name + "." + prop
  }
  return found
}

function importsFor(mod) {
  let seen = Object.create(null), result = []
  function enter(name) {
    if (name in seen) return
    seen[name] = true
    let mod
    for (let i = 0; i < modules.length; i++)
      if (modules[i].name == name) mod = modules[i]
    if (mod.deps) mod.deps.forEach(enter)
    result.push(getImport(name))
  }
  if (mod.deps) mod.deps.forEach(enter)
  return result
}

let toc = {Intro: "#top.intro"}, output = modules.map(module => {
  let tocPart = toc[module.name] = {href: "#" + module.name + "._module", sub: null}
  let text = builddocs.build({
    name: module.name,
    imports: [{
      constructor: false,
      T: false
    }, ...importsFor(module)],
    qualifiedImports: {
      dom: builddocs.browserImports
    }
  }, read[module.name]).replace(/<h3>(.*?)<\/h3>/g, function(full, text) {
    let id = module.name + "." + text.replace(/\W+/g, "_")
    if (!tocPart.sub) tocPart.sub = {}
    tocPart.sub[text] = "#" + id
    return `<h3 id="${id}"><a href="#${id}">${text}</a></h3>`
  })
  return {name: module.name, text}
})

module.exports = {
  env: {
    modules: output,
    nav: toc
  }
}
