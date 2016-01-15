var fs = require("fs")
var markdown = (new (require("markdown-it"))).use(require("markdown-it-deflist"))
var Mold = require("mold-template")

module.exports = function loadTemplates(options) {
  var mold = new Mold(options.env || {})
  fs.readdirSync(options.dir).forEach(function(filename) {
    var match = /^(.*?)\.html$/.exec(filename)
    if (match)
      mold.bake(match[1], fs.readFileSync(options.dir + match[1] + ".html", "utf8").trim())
  })
  mold.defs.markdown = function(text) {
    if (!text) return ""
    return markdown.render(options.markdownFilter ? options.markdownFilter(text) : text)
  }
  mold.defs.markdownFile = function(name) {
    return mold.defs.markdown(fs.readFileSync(options.markdownDir + name + ".md", "utf8"))
  }
  return mold
}
