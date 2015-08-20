import {ProseMirror} from "prosemirror/dist/edit"
import {elt} from "prosemirror/dist/dom"
import "prosemirror/dist/convert/from_markdown"
import "prosemirror/dist/convert/to_markdown"
import "prosemirror/dist/menu/inlinemenu"
import "prosemirror/dist/menu/buttonmenu"

let place = document.querySelector("#editor")

let getContent
function toTextArea(content, focus) {
  let te = place.appendChild(elt("textarea", {style: "font-family: inherit; font-size: inherit"}))
  te.value = content
  if (focus !== false) te.focus()
  getContent = () => te.value
}
function toProseMirror(content) {
  let pm = new ProseMirror({
    place: place,
    doc: content,
    docFormat: "markdown",
    inlineMenu: true,
    buttonMenu: true
  })
  pm.focus()
  getContent = () => pm.getContent("markdown")
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
