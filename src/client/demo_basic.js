import {ProseMirror} from "prosemirror/dist/edit"
import "prosemirror/dist/inputrules/autoinput"
import "prosemirror/dist/menu/inlinemenu"
import "prosemirror/dist/menu/buttonmenu"
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
    pm.setOption("inlineMenu", false)
    pm.setOption("buttonMenu", false)
  } else {
    pm.setOption("menuBar", false)
    pm.setOption("inlineMenu", true)
    pm.setOption("buttonMenu", {followCursor: true})
  }
}

let menuStyle = document.querySelector("#menustyle")
if (menuStyle) menuStyle.addEventListener("change", () => setMenuStyle(menuStyle.value))
