import {ProseMirror} from "prosemirror/dist/edit"
import {elt} from "prosemirror/dist/dom"
import "prosemirror/dist/parse/markdown"
import "prosemirror/dist/serialize/markdown"
import "prosemirror/dist/menu/tooltipmenu"

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
    tooltipMenu: true
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
