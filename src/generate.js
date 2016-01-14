var path = require("path")
var fs = require("fs")
var loadTemplates = require("./doc/mold")

var mold = loadTemplates({
  dir: __dirname + "/../templates/"
})

var pageDir = path.resolve(__dirname + "/../pages/")
var outDir = path.resolve(__dirname + "/../public/")

for (var i = 2; i < process.argv.length; i++) {
  var outfile = path.resolve(process.argv[i]), infile = pageDir + outfile.slice(outDir.length)
  fs.writeFileSync(outfile, mold.bake(infile, fs.readFileSync(infile, "utf8"))(), "utf8")
}
