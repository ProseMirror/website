import {ProseMirror, defineOption, Keymap} from "prosemirror/dist/edit"
import {Inline, Attribute, Schema, defaultSchema} from "prosemirror/dist/model"
import {registerItem, MenuItem} from "prosemirror/dist/menu/items"
import {elt} from "prosemirror/dist/dom"
import {addInputRules, Rule} from "prosemirror/dist/inputrules/inputrules"
import {Tooltip} from "prosemirror/dist/menu/tooltip"
import "prosemirror/dist/menu/menubar"
import "prosemirror/dist/inputrules/autoinput"

const dinos = ["brontosaurus", "stegosaurus", "triceratops", "tyrannosaurus", "pterodactyl"]

class Dino extends Inline {}
Dino.attributes = {type: new Attribute("brontosaurus")}
Dino.register("parseDOM", {
  tag: "img",
  rank: 25,
  parse: (dom, context, nodeType) => {
    let type = dom.getAttribute("dino-type")
    if (!type) return false
    context.insert(nodeType.create({type}))
  }
})
Dino.prototype.serializeDOM = node => elt("img", {
  "dino-type": node.attrs.type,
  class: "dinosaur",
  src: "dino/" + node.attrs.type + ".png",
  title: node.attrs.type
})

const dinoSchema = new Schema(defaultSchema.spec.updateNodes({dino: Dino}))

class DinoItem extends MenuItem {
  constructor(image, action) {
    super()
    this.image = image
    this.action = action
  }
  select(pm) { return pm.schema.nodes.dino }
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
  pm.apply(pm.tr.insertInline(pm.selection.head, dinoSchema.node("dino", {type: name})))
}

let pm = window.dinoPM = new ProseMirror({
  place: document.querySelector("#editor"),
  menuBar: true,
  doc: document.querySelector("#content").innerHTML,
  docFormat: "html",
  schema: dinoSchema,
  autoInput: true
})
addInputRules(pm, dinos.map(name => new Rule("]", new RegExp("\\[" + name + "\\]"), (pm, _, pos) => {
  let start = pos.shift(-(name.length + 2))
  pm.apply(pm.tr.delete(start, pos).insertInline(start, dinoSchema.node("dino", {type: name})))
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
    pm.apply(pm.tr.delete(from, to).insertInline(from, dinoSchema.node("dino", {type: name})))
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
