import {ProseMirror, defineOption, Keymap} from "prosemirror/dist/edit"
import {nodeTypes, NodeType, Span} from "prosemirror/dist/model"
import {fromMarkdown} from "prosemirror/dist/convert/from_markdown"
import {render as renderDOM} from "prosemirror/dist/convert/to_dom"
import {tags as parseTags} from "prosemirror/dist/convert/from_dom"
import {registerItem, MenuItem} from "prosemirror/dist/menu/items"
import {elt} from "prosemirror/dist/dom"
import {addInputRules, Rule} from "prosemirror/dist/inputrules/inputrules"
import {Tooltip} from "prosemirror/dist/menu/tooltip"
import "prosemirror/dist/convert/to_markdown"
import "prosemirror/dist/menu/inlinemenu"
import "prosemirror/dist/menu/buttonmenu"
import "prosemirror/dist/menu/menubar"
import "prosemirror/dist/inputrules/autoinput"

function initMarkdownView() {
  let place = document.querySelector("#markdown_editor")

  let state = "textarea", getContent
  function toTextArea(content) {
    let te = place.appendChild(elt("textarea", {style: "font-family: inherit; font-size: inherit"}))
    te.value = content
    te.focus()
    getContent = () => te.value
  }
  function toProseMirror(content) {
    let pm = new ProseMirror({
      place: place,
      doc: fromMarkdown(content),
      inlineMenu: true,
      buttonMenu: true
    })
    pm.focus()
    getContent = () => pm.getContent("markdown")
  }
  toTextArea(document.querySelector("#markdown_content").textContent)

  function change() {
    let content = getContent()
    place.textContent = ""
    if (document.querySelector("#inputformat").checked) toTextArea(content)
    else toProseMirror(content)
  }
  let radios = document.querySelectorAll("[name=inputformat]")
  for (let i = 0; i < radios.length; i++) radios[i].addEventListener("change", change)
}

function initWidgetEditor() {
  const dinos = ["brontosaurus", "stegosaurus", "triceratops", "tyrannosaurus", "pterodactyl"]

  nodeTypes.dino = new NodeType({name: "dino", type: "span", defaultAttrs: {type: "brontosaurus"}})
  renderDOM.dino = node => elt("img", {"dino-type": node.attrs.type,
                                       class: "dinosaur",
                                       src: "dino/" + node.attrs.type + ".png",
                                       title: node.attrs.type})
  let oldImg = parseTags.img
  parseTags.img = (dom, context) => {
    if (dom.className == "dinosaur") context.insert(new Span("dino", {type: dom.getAttribute("dino-type")}))
    else return oldImg(dom, context)
  }

  class DinoItem extends MenuItem {
    constructor(image, action) {
      super()
      this.image = image
      this.action = action
    }
    select(pm) { return pm.getOption("dinos") }
    render(menu) {
      let button = elt("img", {src: "dino/" + this.image + ".png", class: "dinoicon", title: "Insert dinosaur"})
      button.addEventListener("mousedown", e => {
        e.preventDefault(); e.stopPropagation()
        menu.run(this.action(menu.pm))
      })
      return button
    }
  }
  let dinoItems = dinos.map(name => new DinoItem(name, pm => insertDino(pm, name)))
  registerItem("inline", new DinoItem("brontosaurus", () => dinoItems))

  function insertDino(pm, name) {
    pm.apply(pm.tr.insertInline(pm.selection.head, new Span("dino", {type: name})))
  }

  defineOption("dinos", false)
  let pm = window.dinoPM = new ProseMirror({
    place: document.querySelector("#widget_editor"),
    menuBar: true,
    doc: document.querySelector("#widget_content").innerHTML,
    docFormat: "html",
    dinos: true,
    autoInput: true
  })
  addInputRules(pm, dinos.map(name => new Rule("]", new RegExp("\\[" + name + "\\]"), (pm, _, pos) => {
    let start = pos.shift(-(name.length + 2))
    pm.apply(pm.tr.delete(start, pos).insertInline(start, new Span("dino", {type: name})))
  })))

  let tooltip = new Tooltip(pm, "below"), open
  pm.content.addEventListener("keydown", () => { tooltip.close(); open = null })
  pm.content.addEventListener("mousedown", () => { tooltip.close(); open = null })
  pm.on("textInput", text => {
    if (!/[\[\w]/.test(text)) return
    let pos = pm.selection.head
    let line = pm.doc.path(pos.path).textContent
    let bracket = line.lastIndexOf("[", pos.offset)
    if (bracket == -1) return
    let word = line.slice(bracket + 1, pos.offset)
    let completions = dinos.filter(name => name.indexOf(word) == 0)
    if (completions.length) showCompletions(completions, pos.shift(-(word.length + 1)), pos)
  })

  function showCompletions(dinos, from, to) {
    function applyCompletion(name) {
      pm.apply(pm.tr.delete(from, to).insertInline(from, new Span("dino", {type: name})))
      tooltip.close()
    }
    let items = dinos.map(name => {
      let icon = elt("img", {src: "dino/" + name + ".png", class: "dinoicon", title: name})
      let item = elt("div", {style: "cursor: pointer"}, icon, " " + name)
      item.addEventListener("mousedown", e => {
        e.preventDefault()
        applyCompletion(name)
      })
      return item
    })
    let coords = pm.coordsAtPos(from)
    tooltip.open(elt("div", null, items), {left: coords.left, top: coords.bottom})
    open = () => applyCompletion(dinos[0])
  }

  pm.addKeymap(new Keymap({
    Tab: pm => {
      if (open) open()
      else return false
    }
  }))
}

initMarkdownView()
initWidgetEditor()
