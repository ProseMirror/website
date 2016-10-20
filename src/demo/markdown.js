const {MenuBarEditorView} = require("prosemirror-menu")
const {EditorState} = require("prosemirror-state")
const {schema, defaultMarkdownParser, defaultMarkdownSerializer} = require("prosemirror-markdown")
const {exampleSetup} = require("prosemirror-example-setup")

let place = document.querySelector("#editor")

let getContent
function toTextArea(content, focus) {
  let te = place.appendChild(document.createElement("textarea"))
  te.style.cssText = "font-family: inherit; font-size: inherit"
  te.value = content
  if (focus !== false) te.focus()
  getContent = () => te.value
}
function toProseMirror(content) {
  let view = new MenuBarEditorView(place, {
    state: EditorState.create({
      doc: defaultMarkdownParser.parse(content),
      plugins: exampleSetup({schema})
    }),
    onAction: action => view.updateState(view.editor.state.applyAction(action))
  })
  view.editor.focus()
  getContent = () => defaultMarkdownSerializer.serialize(view.editor.state.doc)
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
