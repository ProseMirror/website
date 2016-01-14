import {ProseMirror} from "prosemirror/dist/edit"
import "prosemirror/dist/inputrules/autoinput"
import "prosemirror/dist/menu/tooltipmenu"
import "prosemirror/dist/menu/menubar"

let place = document.querySelector("#editor");
let content = document.querySelector("#content")

let pm = window.pm = new ProseMirror({
  place: place,
  autoInput: true,
  doc: content,
  docFormat: "dom"
})

content.style.display = "none"

setMenuStyle(place.getAttribute("menustyle") || "bar")

function setMenuStyle(type) {
  if (type == "bar") {
    pm.setOption("menuBar", {float: true})
    pm.setOption("tooltipMenu", false)
  } else {
    pm.setOption("menuBar", false)
    pm.setOption("tooltipMenu", {selectedBlockMenu: true})
  }
}

let menuStyle = document.querySelector("#menustyle")
if (menuStyle) menuStyle.addEventListener("change", () => setMenuStyle(menuStyle.value))
