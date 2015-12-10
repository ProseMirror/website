var fs = require("fs")

var markdown = new (require("markdown-it"))
var mold = require("mold-template")
var glob = require("glob")
var getdocs = require("getdocs")

var utils = {
  render: function(md) { return markdown.render(md) },
  isEmpty: function(obj) { for (var _ in obj) return false; return true },
  extend: function(base, ext) { return base ? base + "." + ext : ext }
}

function loadTemplates(templateDir, env) {
  var templates = {}
  fs.readdirSync(templateDir).forEach(function(filename) {
    var match = /^(.*?)\.html$/.exec(filename)
    if (match) {
      var template = mold.bake(fs.readFileSync(templateDir + match[1] + ".html", "utf8").trim(), env)
      templates[match[1]] = template
      mold.define(match[1], template)
    }
  })
  return templates
}

function findIntro(text) {
  var match = /(?:\n|^)\s*\/\/(\s*)!!(.*(?:\n\s*\/\/.*)*)/.exec(text)
  if (match) return match[2].replace(/\n\s*\/\/ ?/g, "\n")
}

exports.build = function(config) {
  var env = {}, items = {}
  for (var prop in utils) env[prop] = utils[prop]
  for (var prop in config) env[prop] = config[prop]

  config.files.forEach(function(pat) {
    glob.sync(pat, {cwd: config.sourceDir}).forEach(function(filename) {
      var text = fs.readFileSync(config.sourceDir + filename, "utf8")
      var intro = findIntro(text)
      if (intro) env.intro = intro
      getdocs.gather(text, filename, items)
    })
  })

  var templates = loadTemplates(__dirname + "/templates/", env)

  return templates.index(items)
}
