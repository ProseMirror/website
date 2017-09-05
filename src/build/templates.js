var fs = require("fs")
var Mold = require("mold-template")
var CodeMirror = require("codemirror/addon/runmode/runmode.node.js")
require("codemirror/mode/javascript/javascript.js")
require("codemirror/mode/xml/xml.js")
var markdown = (require("markdown-it")({
  html: true,
  highlight
})).use(require("markdown-it-deflist"))

module.exports = function loadTemplates(config) {
  var mold = new Mold(config.env || {})
  fs.readdirSync(config.dir).forEach(function(filename) {
    var match = /^(.*?)\.html$/.exec(filename)
    if (match)
      mold.bake(match[1], fs.readFileSync(config.dir + match[1] + ".html", "utf8").trim())
  })
  mold.defs.markdown = function(options) {
    if (typeof options == "string") options = {text: options}
    let md = options.text
    if (config.markdownFilter) md = config.markdownFilter(md)
    if (options.anchors) md = headerAnchors(md, options.anchors === true ? "" : options.anchors + ".")
    let html = markdown.render(md)
    if (options.shiftHeadings) html = html.replace(/<(\/?)h(\d)\b/ig, (_, cl, d) => "<" + cl + "h" + (+d + options.shiftHeadings))
    return html
  }
  mold.defs.markdownFile = function(options) {
    if (typeof options == "string") options = {file: options}
    options.text = fs.readFileSync(config.markdownDir + options.file + ".md", "utf8")
    return mold.defs.markdown(options)
  }
  return mold
}

function highlight(str, lang) {
  if (lang == "html") lang = "text/html"
  let result = ""
  CodeMirror.runMode(str, lang, (text, style) => {
    let esc = markdown.utils.escapeHtml(text)
    result += style ? `<span class="${style.replace(/^|\s+/g, "$&hl-")}">${esc}</span>` : esc
  })
  return result
}

function headerAnchors(str, prefix) {
  return str.replace(/((?:^|\n)#+ )(.*)/g, function(_, before, title) {
    var anchor = title.replace(/\s/g, "_").replace(/[^\w_]/g, "").toLowerCase()
    return before + "<a id=\"" + prefix + anchor + "\"></a>" + title
  })
}
