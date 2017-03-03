var fs = require("fs")
var loadTemplates = require("./templates")

var config = {
  dir: __dirname + "/../../templates/",
  markdownDir: __dirname + "/../../markdown/",
  markdownFilter: function(text) {
    return text.replace(/\(##([^)]+)\)/g, function(_, anchor) {
      return "(/docs/ref/#" + anchor + ")"
    })
  },
  env: {
    ref: function() { return require("./ref") }
  }
}

var mold = loadTemplates(config)

exports.buildFile = function(file) {
  var text = fs.readFileSync(file, "utf8"), result
  if (/\.md$/.test(file)) {
    var meta = /^!(\{[^]*?\})\n\n/.exec(text)
    if (!meta) throw new Error("Missing or invalid metainfo on " + file)
    var data = JSON.parse(meta[1])
    data.content = text.slice(meta[0].length)
    result = mold.defs[data.template](data)
  } else {
    result = mold.bake(file, text)()
  }
  return result
}
