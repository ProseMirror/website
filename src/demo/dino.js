const {ProseMirror, defineOption, Keymap} = require("prosemirror/dist/edit")
const {fromDOM} = require("prosemirror/dist/htmlformat")
const {Inline, Attribute, Schema} = require("prosemirror/dist/model")
const {defaultSchema} = require("prosemirror/dist/schema")
const {defaultSetup} = require("prosemirror/dist/schema/defaultsetup")
const {defaultMenuItems} = require("prosemirror/dist/schema/menu")
const {elt} = require("prosemirror/dist/util/dom")
const {InputRule, inputRules} = require("prosemirror/dist/inputrules")
const {Tooltip} = require("prosemirror/dist/ui/tooltip")
const {insertItem} = require("prosemirror/dist/menu/menu")
const {FieldPrompt, SelectField} = require("prosemirror/dist/ui/prompt")

const dinos = ["brontosaurus", "stegosaurus", "triceratops", "tyrannosaurus", "pterodactyl"]

class Dino extends Inline {
  get attrs() {
    return {type: new Attribute("brontosaurus")}
  }
  get matchDOMTag() {
    return {"img[dino-type]": dom => {
      let type = dom.getAttribute("dino-type")
      if (dinos.indexOf(type) > -1) return {type}
    }}
  }
  toDOM(node) {
    return ["img", {"dino-type": node.attrs.type,
                    src: "/img/dino/" + node.attrs.type + ".png",
                    title: node.attrs.type,
                    class: "dinosaur"}]
  }
}

const dinoSchema = new Schema({
  nodes: defaultSchema.nodeSpec.addBefore("image", "dino", {type: Dino, group: "inline"}),
  marks: defaultSchema.markSpec
})

const dinoField = new SelectField({
  label: "Type",
  required: true,
  options: dinos.map(name => ({value: name, label: name}))
})

const dinoMenuItem = insertItem(dinoSchema.nodes.dino, {
  title: "Insert a dino",
  label: "Dino",
  attrs(pm, callback) {
    new FieldPrompt(pm, "Insert a dino", {type: dinoField}).open(callback)
  }
})

const dinoInputRule = new InputRule(new RegExp("\\[(" + dinos.join("|") + ")\\]$"), "]", (pm, match, pos) => {
  let start = pos - match[0].length
  pm.tr.delete(start, pos).insertInline(start, dinoSchema.nodes.dino.create({type: match[1]})).apply()
})

let menu = defaultMenuItems(dinoSchema)
menu.insertMenu.content.push(dinoMenuItem)

let pm = window.pm = new ProseMirror({
  place: document.querySelector("#editor"),
  doc: fromDOM(dinoSchema, document.querySelector("#content")),
  schema: dinoSchema,
  plugins: [
    defaultSetup.config({menu: menu.fullMenu})
  ]
})

inputRules.get(pm).addRule(dinoInputRule)

let tooltip = new Tooltip(pm.wrapper, "below"), open, closingTooltip
pm.on.interaction.add(() => {
  clearTimeout(closingTooltip)
  closingTooltip = setTimeout(() => {tooltip.close(); open = null}, 100)
})
pm.on.textInput.add(text => {
  if (!/[\[\w]/.test(text)) return
  let head = pm.selection.head
  if (head == null) return
  let $pos = pm.doc.resolve(head), line = ""
  for (let i = 0, rem = $pos.parentOffset; rem > 0; i++) {
    let child = $pos.parent.child(i)
    if (child.isText) line += child.text.slice(0, rem)
    else line = ""
    rem -= child.nodeSize
  }
  let bracket = line.lastIndexOf("[")
  if (bracket == -1) return
  let word = line.slice(bracket + 1)
  let completions = dinos.filter(name => name.indexOf(word) == 0)
  if (completions.length) {
    let flush = () => {
      pm.on.flush.remove(flush)
      showCompletions(completions, head - word.length - 1, head)
    }
    pm.on.flush.add(flush)
  }
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
  clearTimeout(closingTooltip)
}

pm.addKeymap(new Keymap({
  Tab: pm => {
    if (open) open()
    else return false
  }
}))
