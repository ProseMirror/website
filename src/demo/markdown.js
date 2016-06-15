const {ProseMirror} = require("prosemirror/dist/edit")
const {elt} = require("prosemirror/dist/util/dom")
const {defaultMarkdownParser, defaultMarkdownSerializer} = require("prosemirror/dist/markdown")
const {schema} = require("prosemirror/dist/schema-basic")
const {exampleSetup} = require("prosemirror/dist/example-setup")

let place = document.querySelector("#editor")

let getContent
function toTextArea(content, focus) {
  let te = place.appendChild(elt("textarea", {style: "font-family: inherit; font-size: inherit"}))
  te.value = content
  if (focus !== false) te.focus()
  getContent = () => te.value
}
function toProseMirror(content) {
  let pm = window.pm = new ProseMirror({
    place: place,
    doc: defaultMarkdownParser.parse(content),
    plugins: [
      exampleSetup.config({
        menuBar: false,
        tooltipMenu: true
      })
    ]
  })
  pm.focus()
  getContent = () => defaultMarkdownSerializer.serialize(pm.doc)
}
toTextArea(document.querySelector("#markdown_content").textContent, false)

function change() {
  let content = getContent()
  place.textContent = ""
  if (document.querySelector("#inputformat").checked) toTextArea(content)
  else toProseMirror(content)
}
let radios = document.querySelectorAll("[name=inputformat]")
for (let i = 0; i < radios.length; i++) radios[i].addEventListener("change", change)
