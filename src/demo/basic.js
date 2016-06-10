const {ProseMirror} = require("prosemirror/dist/edit")
const {fromDOM} = require("prosemirror/dist/htmlformat")
const {defaultSchema: schema} = require("prosemirror/dist/schema")
const {defaultSetup} = require("prosemirror/dist/schema/defaultsetup")
const {tooltipMenu} = require("prosemirror/dist/menu/tooltipmenu")
const {menuBar} = require("prosemirror/dist/menu/menubar")
const {defaultMenuItems} = require("prosemirror/dist/schema/menu")

let place = document.querySelector("#editor")
let content = document.querySelector("#content")

let pm = window.pm = new ProseMirror({
  place: place,
  doc: fromDOM(schema, content),
  schema: schema,
  plugins: [defaultSetup.config({menu: false})]
})
content.style.display = "none"

let menu = defaultMenuItems(schema)

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
