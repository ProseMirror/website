import {ProseMirror} from "prosemirror/dist/edit"
import "prosemirror/dist/inputrules/autoinput"
import "prosemirror/dist/menu/tooltipmenu"
import "prosemirror/dist/menu/menubar"

let place = document.querySelector("#editor");

let pm = window.pm = new ProseMirror({
  place: place,
  autoInput: true,
  doc: document.querySelector("#content"),
  docFormat: "dom"
})

setMenuStyle(place.getAttribute("menustyle") || "bar")

function setMenuStyle(type) {
  if (type == "bar") {
    pm.setOption("menuBar", {float: true})
    pm.setOption("tooltipMenu", false)
  } else {
    pm.setOption("menuBar", false)
    pm.setOption("tooltipMenu", {emptyBlockMenu: true})
  }
}

let menuStyle = document.querySelector("#menustyle")
if (menuStyle) menuStyle.addEventListener("change", () => setMenuStyle(menuStyle.value))
