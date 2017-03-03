var fs = require("fs")
var markdown = (require("markdown-it")({html: true})).use(require("markdown-it-deflist"))
var Mold = require("mold-template")

module.exports = function loadTemplates(config) {
  var mold = new Mold(config.env || {})
  fs.readdirSync(config.dir).forEach(function(filename) {
    var match = /^(.*?)\.html$/.exec(filename)
    if (match)
      mold.bake(match[1], fs.readFileSync(config.dir + match[1] + ".html", "utf8").trim())
  })
  mold.defs.markdown = function(options) {
    if (typeof options == "string") options = {text: options}
    let text = options.text
    if (options.shiftHeadings) text = text.replace(/<h(\d)\b/g, (_, d) => "<" + (d + options.shiftHeadings))
    return markdown.render(config.markdownFilter ? config.markdownFilter(text) : text)
  }
  mold.defs.markdownFile = function(options) {
    if (typeof options == "string") options = {file: options}
    options.text = fs.readFileSync(config.markdownDir + options.file + ".md", "utf8")
    return mold.defs.markdown(options)
  }
  return mold
}
