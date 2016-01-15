var path = require("path")
var fs = require("fs")
var loadTemplates = require("./templates")

var config = {
  dir: __dirname + "/../../templates/",
  markdownDir: __dirname + "/../../markdown/"
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
  var outfile = path.resolve(file), infile = pageDir + outfile.slice(outDir.length)
  fs.writeFileSync(outfile, mold.bake(infile, fs.readFileSync(infile, "utf8"))(), "utf8")
})
