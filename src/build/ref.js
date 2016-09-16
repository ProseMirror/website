var fs = require("fs")
var glob = require("glob")
var getdocs = require("getdocs")
var builddocs = require("builddocs")

var modules = [{
  name: "state",
  deps: ["model", "transform", "view"]
}, {
  name: "view",
  deps: ["state"]
}, {
  name: "model"
}, {
  name: "transform",
  deps: ["model"]
}, {
  name: "commands",
  deps: ["state"]
}, {
  name: "history",
  deps: ["state"]
}, {
  name: "collab",
  deps: ["state"]
}, {
  name: "keymap",
  deps: ["state"]
}, {
  name: "inputrules",
  deps: ["state"]
}, {
  name: "schema-basic",
  deps: ["model"]
}, {
  name: "schema-list",
  deps: ["state"]
}, {
  name: "schema-table",
  deps: ["state"]
}]

var baseDir = __dirname + "/../../node_modules/"

let read = Object.create(null)
modules.forEach(config => read[config.name] = builddocs.read({
  files: baseDir + "prosemirror-" + config.name + "/src/*.js"
}))

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

function moduleHead(name) {
  return `<h2 id=${name}><a href="#${name}"><span class=kind>module</span> ${name}</a></h2>`
}

let toc = {Intro: "#top.intro"}, output = modules.map(module => {
  let tocPart = toc[module.name] = {href: "#" + module.name, sub: null}
  let text = moduleHead(module.name) + builddocs.build({
    name: module.name,
    main: baseDir + "prosemirror-" + module.name + "/src/README.md",
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
