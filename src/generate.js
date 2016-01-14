var fs = require("fs")
var loadTemplates = require("./doc/mold")
var glob = require("glob")

var mold = loadTemplates({
  dir: __dirname + "/../templates/"
})

var pageDir = __dirname + "/../pages/"
glob.sync("**/*.html", {cwd: pageDir}).forEach(function(file) {
  fs.writeFileSync(__dirname + "/../public/" + file, mold.bake(file, fs.readFileSync(pageDir + file, "utf8"))(), "utf8")
})
