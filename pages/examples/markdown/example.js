const {EditorView} = require("prosemirror-view")
const {EditorState} = require("prosemirror-state")
const {schema, defaultMarkdownParser, defaultMarkdownSerializer} = require("prosemirror-markdown")
const {exampleSetup} = require("prosemirror-example-setup")

let place = document.querySelector("#editor")

let getContent
function toTextArea(content, focus) {
  window.view = undefined
  let te = place.appendChild(document.createElement("textarea"))
  te.style.cssText = "font-family: inherit; font-size: inherit"
  te.value = content
  if (focus !== false) te.focus()
  getContent = () => te.value
}
function toProseMirror(content) {
  let view = window.view = new EditorView(place, {
    state: EditorState.create({
      doc: defaultMarkdownParser.parse(content),
      plugins: exampleSetup({schema})
    })
  })
  view.focus()
  getContent = () => {
    let content = defaultMarkdownSerializer.serialize(view.state.doc)
    view.destroy()
    return content
  }
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
