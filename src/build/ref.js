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
  order: "index main options selection range command base_commands schema_commands"
}, {
  name: "model",
  files: "src/model/*.js",
  order: "index node fragment mark pos schema content defaultschema"
}, {
  name: "transform",
  files: "src/transform/*.js",
  order: "index step mark_step replace_step map transform mark replace structure"
}, {
  name: "format",
  files: "src/format/*.js",
  order: "index register from_dom to_dom from_text to_text"
}, {
  name: "markdown",
  files: "src/markdown/*.js",
  order: "index from_markdown to_markdown"
}, {
  name: "inputrules",
  files: "src/inputrules/*.js",
  order: "index inputrules autoinput"
}, {
  name: "menu/menubar",
  files: "src/menu/menubar.js"
}, {
  name: "menu/tooltipmenu",
  files: "src/menu/tooltipmenu.js"
}, {
  name: "menu/menu",
  files: "src/menu/menu.js"
}, {
  name: "ui/prompt",
  files: "src/ui/prompt.js"
}, {
  name: "ui/tooltip",
  files: "src/ui/tooltip.js"
}, {
  name: "ui/update",
  files: "src/ui/update.js"
}, {
  name: "collab",
  files: "src/collab/*.js",
  order: "index rebase"
}, {
  name: "util/orderedmap",
  files: "src/util/orderedmap.js"
}, {
  name: "util/event",
  files: "src/util/event.js"
}, {
  name: "util/error",
  files: "src/util/error.js"
}]

var externalTypes = {
  string: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String",
  bool: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean",
  number: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number",
  Iterator: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols",
  Array: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
  Object: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object",
  RegExp: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp",
  MarkdownToken: "https://markdown-it.github.io/markdown-it/#Token",
  DOMNode: "https://developer.mozilla.org/en-US/docs/Web/API/Node",
  DOMFragment: "https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment",
  DOMDocument: "https://developer.mozilla.org/en-US/docs/Web/API/Document",
  DOMEvent: "https://developer.mozilla.org/en-US/docs/Web/API/Event",
  KeyboardEvent: "https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent",
  MouseEvent: "https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent",
  Keymap: "https://github.com/marijnh/browserkeymap#an-object-type-for-keymaps",
  Error: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error",
  any: false,
  union: false,
  constructor: false
}

function propID(clss, prop, static) {
  var id = clss + "." + prop, item = config.items[clss]
  if (static && item.instanceProperties && prop in item.instanceProperties) id += "_static"
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
  if (module.order) for (var order = module.order.split(" "), i = order.length - 1; i >= 0; i--)  {
    for (var j = 0; j < files.length; j++) if (files[j].match(new RegExp("\\/" + order[i] + "\\.js$"))) {
      files.unshift(files.splice(j, 1)[0])
      break
    }
  }
  return files
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
      commands = Object.create(null)
  for (var prop in items) {
    var item = items[prop]
    if (item.kind == "class" || item.kind == "interface") classes[prop] = organizeClass(item)
    else if (item.kind == "option") options[prop] = item
    else if (item.kind == "command") commands[prop] = item
    else if (item.type == "Function") functions[prop] = item
    else vars[prop] = item
  }
  return {classes: notEmpty(classes),
          options: notEmpty(options),
          commands: notEmpty(commands),
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
    if (item.$noAnchor) continue
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
