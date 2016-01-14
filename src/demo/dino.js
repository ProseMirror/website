import {ProseMirror, defineOption, Keymap} from "prosemirror/dist/edit"
import {Inline, Attribute, Schema, defaultSchema} from "prosemirror/dist/model"
import {elt} from "prosemirror/dist/dom"
import {InputRule} from "prosemirror/dist/inputrules"
import {Tooltip} from "prosemirror/dist/ui/tooltip"
import "prosemirror/dist/menu/menubar"
import "prosemirror/dist/inputrules/autoinput"

const dinos = ["brontosaurus", "stegosaurus", "triceratops", "tyrannosaurus", "pterodactyl"]

class Dino extends Inline {
  get attrs() { return {type: new Attribute("brontosaurus")} }
}

Dino.register("parseDOM", {
  tag: "img",
  rank: 25,
  parse: function(dom, state) {
    let type = dom.getAttribute("dino-type")
    if (!type) return false
    state.insert(this, {type})
  }
})
Dino.prototype.serializeDOM = node => elt("img", {
  "dino-type": node.attrs.type,
  class: "dinosaur",
  src: "/img/dino/" + node.attrs.type + ".png",
  title: node.attrs.type
})

// FIXME restore icon-based selection
const dinoOptions = dinos.map(name => ({value: name, label: name}))

Dino.register("command", {
  name: "insert",
  derive: {params: [{label: "Type", attr: "type", type: "select", options: dinoOptions, default: dinoOptions[0]}]},
  label: "Insert dino"
})

Dino.prototype.insertMenuOptions = [{label: "Dino", command: "insert", rank: 1}]

Dino.register("autoInput", new InputRule("autoDino", new RegExp("\\[(" + dinos.join("|") + ")\\]$"), "]", function(pm, match, pos) {
  let start = pos.move(-match[0].length)
  pm.tr.delete(start, pos).insertInline(start, this.create({type: match[1]})).apply()
}))

const dinoSchema = new Schema(defaultSchema.spec.update({dino: Dino}))

let pm = window.dinoPM = new ProseMirror({
  place: document.querySelector("#editor"),
  menuBar: true,
  doc: document.querySelector("#content").innerHTML,
  docFormat: "html",
  schema: dinoSchema,
  autoInput: true
})

let tooltip = new Tooltip(pm.wrapper, "below"), open
pm.content.addEventListener("keydown", () => { tooltip.close(); open = null })
pm.content.addEventListener("mousedown", () => { tooltip.close(); open = null })
pm.on("textInput", text => {
  if (!/[\[\w]/.test(text)) return
  let pos = pm.selection.head, line = ""
  for (let i = pm.doc.path(pos.path).iter(0, pos.offset), child; child = i.next().value;) {
    if (child.isText) line += child.text
    else line = ""
  }
  let bracket = line.lastIndexOf("[", pos.offset)
  if (bracket == -1) return
  let word = line.slice(bracket + 1, pos.offset)
  let completions = dinos.filter(name => name.indexOf(word) == 0)
  if (completions.length) showCompletions(completions, pos.move(-(word.length + 1)), pos)
})

function showCompletions(dinos, from, to) {
  function applyCompletion(name) {
    pm.tr.delete(from, to).insertInline(from, dinoSchema.node("dino", {type: name})).apply()
    tooltip.close()
  }
  let items = dinos.map(name => {
    let icon = elt("img", {src: "/img/dino/" + name + ".png", class: "dinoicon", title: name})
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
