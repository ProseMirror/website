import {ProseMirror} from "prosemirror/dist/edit"
import "prosemirror/dist/inputrules/autoinput"
import "prosemirror/dist/menu/inlinemenu"
import "prosemirror/dist/menu/buttonmenu"
import "prosemirror/dist/menu/menubar"

let pm = window.pm = new ProseMirror({
  place: document.querySelector("#editor"),
  autoInput: true,
  menuBar: {float: true},
  doc: document.querySelector("#content"),
  docFormat: "dom"
})

let menuStyle = document.querySelector("#menustyle")
menuStyle.addEventListener("change", () => {
  if (menuStyle.value == "bar") {
    pm.setOption("menuBar", {float: true})
    pm.setOption("inlineMenu", false)
    pm.setOption("buttonMenu", false)
  } else {
    pm.setOption("menuBar", false)
    pm.setOption("inlineMenu", true)
    pm.setOption("buttonMenu", {followCursor: true})
  }
})
