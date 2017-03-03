var path = require("path")
var fs = require("fs")
const {buildFile} = require("./buildfile")

var pageDir = path.resolve(__dirname + "/../../pages/")
var outDir = path.resolve(__dirname + "/../../public/")

process.argv.slice(2).forEach(function(file) {
  var result = buildFile(file)
  var outfile = outDir + path.resolve(file).slice(pageDir.length).replace(/\.\w+$/, ".html")
  fs.writeFileSync(outfile, result, "utf8")
})
