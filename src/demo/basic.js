const {ProseMirror} = require("prosemirror/dist/edit")
const {schema} = require("prosemirror/dist/schema-basic")
const {exampleSetup, buildMenuItems} = require("prosemirror/dist/example-setup")
const {tooltipMenu, menuBar} = require("prosemirror/dist/menu")

let place = document.querySelector("#editor")
let content = document.querySelector("#content")

let pm = window.pm = new ProseMirror({
  place: place,
  doc: schema.parseDOM(content),
  plugins: [exampleSetup.config({menuBar: false, tooltipMenu: false})]
})
content.style.display = "none"

let menu = buildMenuItems(schema)

setMenuStyle(place.getAttribute("menustyle") || "bar")

function setMenuStyle(type) {
  if (type == "bar") {
    tooltipMenu.detach(pm)
    menuBar.config({float: true, content: menu.fullMenu}).attach(pm)
  } else {
    menuBar.detach(pm)
    tooltipMenu.config({selectedBlockMenu: true,
                        inlineContent: menu.inlineMenu,
                        blockContent: menu.blockMenu}).attach(pm)
  }
}

let menuStyle = document.querySelector("#menustyle")
if (menuStyle) menuStyle.addEventListener("change", () => setMenuStyle(menuStyle.value))
