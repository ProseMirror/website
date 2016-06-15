var fs = require("fs")
var glob = require("glob")
var getdocs = require("getdocs")

var sourceDir = __dirname + "/../../node_modules/prosemirror/"

var config = {
  sourceDir: sourceDir,
  modules: Object.create(null),
  items: Object.create(null),
  findLink: findLink,
  propID: propID,
  revision: getRevision(sourceDir)
}

var modules = [{
  name: "edit",
  files: "src/edit/*.js",
  order: "index main selection plugin history range transform options update commands keymap"
}, {
  name: "model",
  files: "src/model/*.js",
  order: "index node resolvedpos fragment replace mark schema content diff"
}, {
  name: "transform",
  files: "src/transform/*.js",
  order: "index step mark_step replace_step map transform mark replace structure"
}, {
  name: "markdown",
  files: "src/markdown/*.js",
  order: "index from_markdown to_markdown"
}, {
  name: "inputrules",
  files: "src/inputrules/*.js",
  order: "index inputrules rules util"
}, {
  name: "menu",
  files: "src/menu/*.js",
  order: "index menu menubar tooltipmenu"
}, {
  name: "ui",
  files: "src/ui/*.js",
  order: "index tooltip prompt"
}, {
  name: "collab",
  files: "src/collab/*.js",
  order: "index rebase"
}, {
  name: "schema-basic",
  files: "src/schema-basic/index.js"
}, {
  name: "example-setup",
  files: "src/example-setup/*.js",
  order: "index"
}, {
  name: "util/orderedmap",
  files: "src/util/orderedmap.js"
}]

var externalTypes = {
  string: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String",
  bool: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean",
  number: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number",
  Iterator: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols",
  Array: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
  Object: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object",
  RegExp: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp",
  MarkdownIt: "https://markdown-it.github.io/markdown-it/#MarkdownIt",
  MarkdownToken: "https://markdown-it.github.io/markdown-it/#Token",
  DOMNode: "https://developer.mozilla.org/en-US/docs/Web/API/Node",
  DOMFragment: "https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment",
  DOMDocument: "https://developer.mozilla.org/en-US/docs/Web/API/Document",
  DOMEvent: "https://developer.mozilla.org/en-US/docs/Web/API/Event",
  KeyboardEvent: "https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent",
  MouseEvent: "https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent",
  Keymap: "https://github.com/marijnh/browserkeymap#an-object-type-for-keymaps",
  Subscription: "https://github.com/marijnh/subscription#class-subscription",
  PipelineSubscription: "https://github.com/marijnh/subscription#class-pipelinesubscription-extends-subscription",
  StoppableSubscription: "https://github.com/marijnh/subscription#class-stoppablesubscription-extends-subscription",
  DOMSubscription: "https://github.com/marijnh/subscription#class-domsubscription-extends-subscription",
  Error: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error",
  any: false,
  union: false,
  constructor: false
}

function propID(clss, prop, isStatic) {
  var id = clss + "." + prop, item = config.items[clss]
  if (isStatic && item.instanceProperties && prop in item.instanceProperties) id += "_static"
  return id
}

function findLink(node) {
  if (externalTypes.hasOwnProperty(node.type)) return externalTypes[node.type]
  if (node.type.charAt(0) == '"') return false
  if (config.items[node.type]) return "#" + node.type
  throw new Error("Unknown type referenced: " + node.type + " at " + node.loc.file + ":" + node.loc.line)
}

function exists(path) {
  path = path.split(".")
  if (path.length > 2) return false
  var item
  for (var mod in config.modules) {
    item = config.modules[mod].items[path[0]]
    if (item) break
  }
  if (!item) return false
  return item &&
    (path.length == 1 || (item.properties && item.properties[path[1]]) ||
     (item.instanceProperties && item.instanceProperties[path[1]]))
}

function filesFor(module) {
  var files = module.files.split(" ").reduce(function(set, pat) { return set.concat(glob.sync(pat, {cwd: sourceDir})) }, [])
  if (!module.order) return files

  
  let ordered = module.order.split(" ").map(pat => {
    let re = new RegExp("\\/" + pat + "\\.js$")
    for (let i = 0; i < files.length; i++)
      if (files[i].match(re)) return files.splice(i, 1)[0]
    throw new Error("Order pattern " + pat + " in module " + module.name + " does not match a file")
  })
  return ordered.concat(files)
}

function getExtra(text) {
  var match = /(?:\n|^)\s*\/\/(\s*)!!(.*(?:\n *\/\/.*)*)/.exec(text)
  if (match) return match[2].replace(/\n\s*\/\/ ?/g, "\n")
}

function notEmpty(obj) {
  for (var _ in obj) return obj
}

function organize(items) {
  var classes = Object.create(null), functions = Object.create(null),
      vars = Object.create(null), options = Object.create(null)
  for (var prop in items) {
    var item = items[prop]
    if (item.kind == "class" || item.kind == "interface") classes[prop] = organizeClass(item)
    else if (item.kind == "option") options[prop] = item
    else if (item.type == "Function") functions[prop] = item
    else vars[prop] = item
  }
  return {classes: notEmpty(classes),
          options: notEmpty(options),
          functions: notEmpty(functions),
          vars: notEmpty(vars),
          items: items}
}

function organizeClass(type) {
  var methods = Object.create(null), members = Object.create(null)
  if (type.instanceProperties) for (var prop in type.instanceProperties) {
    var ip = type.instanceProperties[prop]
    if (ip.type == "Function") methods[prop] = ip
    else members[prop] = ip
  }
  type.methods = notEmpty(methods)
  type.members = notEmpty(members)
  return type
}

function getRevision(dir) {
  var file = dir + ".git/HEAD"
  if (!fs.existsSync(file)) // Not a git repository, return version number
    return require(dir + "package.json").version
  for (;;) {
    var content = fs.readFileSync(file, "utf8"), ref
    if (ref = /^ref: (.*)/.exec(content))
      file = dir + ".git/" + ref[1]
    else
      return content.trim()
  }
}

modules.forEach(function(module) {
  var items = Object.create(null), text = ""
  filesFor(module).forEach(function(filename) {
    var file = fs.readFileSync(sourceDir + filename, "utf8")
    getdocs.gather(file, filename, items)
    var extraText = getExtra(file)
    if (extraText) text = (text ? text + "\n\n" : "") + extraText
  })
  for (var prop in items) {
    var item = items[prop]
    if (item.$noAnchor || item.kind == "option") continue
    if (config.items[prop]) throw new Error("Duplicate definition of " + prop)
    config.items[prop] = item
  }
  var org = organize(items)
  org.text = text
  config.modules[module.name] = org
})

module.exports = {
  env: config,
  markdownFilter: function(text) {
    return text.replace(/`([\w\.$]+)`(?!\])/g, function(all, word) {
      return exists(word) ? "[`" + word + "`](#" + word + ")" : all
    })
  }
}
