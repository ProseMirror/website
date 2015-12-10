var fs = require("fs")
var build = require("./build").build

var baseConfig = {
  sourceDir: __dirname + "/../node_modules/prosemirror/",
  intro: ""
}

var pages = {
  model: {
    title: "model",
    files: ["src/model/*.js"],
    output: __dirname + "/../public/doc/model.html"
  }
}

function write(name) {
  var conf = pages[name]
  for (var prop in baseConfig) if (!conf.hasOwnProperty(prop)) conf[prop] = baseConfig[prop]
  fs.writeFileSync(conf.output, build(conf))
}

var target = process.argv[2]

if (target)
  write(target)
else
  for (var page in pages) write(page)
