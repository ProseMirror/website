var path = require("path")
var fs = require("fs")
var loadTemplates = require("./templates")

var config = {
  dir: __dirname + "/../../templates/",
  markdownDir: __dirname + "/../../markdown/",
  markdownFilter: function(text) {
    return text.replace(/\(##([^)]+)\)/g, function(_, anchor) {
      return "(../ref.html#" + anchor + ")"
    })
  }
}

var files = process.argv.slice(2)
if (files.indexOf("--ref") > -1) {
  files.splice(files.indexOf("--ref"), 1)
  var load = require("./ref")
  for (var prop in load) config[prop] = load[prop]
}

var mold = loadTemplates(config)

var pageDir = path.resolve(__dirname + "/../../pages/")
var outDir = path.resolve(__dirname + "/../../public/")

files.forEach(function(file) {
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
  var outfile = outDir + path.resolve(file).slice(pageDir.length).replace(/\.\w+$/, ".html")
  fs.writeFileSync(outfile, result, "utf8")
})
