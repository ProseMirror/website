function asTextArea(target, content) {
  window.view = undefined
  let textarea = target.appendChild(document.createElement("textarea"))
  textarea.style.cssText = "font-family: inherit; font-size: inherit"
  textarea.value = content
  return {
    type: "textarea",
    get content() { return textarea.value },
    focus() { textarea.focus() },
    destroy() {}
  }
}

import {EditorView} from "prosemirror-view"
import {EditorState} from "prosemirror-state"
import {exampleSetup} from "prosemirror-example-setup"
import {schema, defaultMarkdownParser,
        defaultMarkdownSerializer} from "prosemirror-markdown"

function asProseMirror(target, content) {
  let view = new EditorView(place, {
    state: EditorState.create({
      doc: defaultMarkdownParser.parse(content),
      plugins: exampleSetup({schema})
    })
  })
  return {
    type: "prosemirror",
    get content() { return defaultMarkdownSerializer.serialize(view.state.doc) },
    focus() { view.focus() },
    destroy() { view.destroy() }
  }
}

let place = document.querySelector("#editor")
let editor = asTextArea(place, document.querySelector("#content").textContent)

function changeTo(type) {
  if (editor.type == type) return
  let content = editor.content
  editor.destroy()
  place.textContent = ""
  if (type == "prosemirror") editor = asProseMirror(place, content)
  else editor = asTextArea(place, content)
  editor.focus()
}

document.querySelector("#radio_markdown").addEventListener("change", e => {
  if (e.target.checked) changeTo("textarea")
})
document.querySelector("#radio_prosemirror").addEventListener("change", e => {
  if (e.target.checked) changeTo("prosemirror")
})
