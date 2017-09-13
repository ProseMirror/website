var CodeMirror = require("codemirror/addon/runmode/runmode.node.js")
require("codemirror/mode/javascript/javascript.js")
require("codemirror/mode/xml/xml.js")
var escapeHtml = require("markdown-it")().utils.escapeHtml

exports.highlight = function(str, lang) {
  if (lang == "html") lang = "text/html"
  let result = ""
  CodeMirror.runMode(str, lang, (text, style) => {
    let esc = escapeHtml(text)
    result += style ? `<span class="${style.replace(/^|\s+/g, "$&hl-")}">${esc}</span>` : esc
  })
  return result
}
