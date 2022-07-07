const {highlightTree, classHighlighter} = require("@lezer/highlight")
const {parser: jsParser} = require("@lezer/javascript")
const {parser: htmlParser} = require("@lezer/html")
var escapeHtml = require("markdown-it")().utils.escapeHtml

exports.highlight = function(str, lang) {
  let parser = lang == "html" ? htmlParser : lang == "javascript" ? jsParser : null
  if (!parser) return escapeHtml(str)
  let pos = 0, result = ""
  highlightTree(parser.parse(str), classHighlighter, (from, to, cls) => {
    result += escapeHtml(str.slice(pos, from))
    result += `<span class="${cls}">${escapeHtml(str.slice(from, to))}</span>`
    pos = to
  })
  result += escapeHtml(str.slice(pos))
  return result
}
