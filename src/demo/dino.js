const {EditorView} = require("prosemirror-view")
const {EditorState} = require("prosemirror-state")
const {MenuBarEditorView, MenuItem} = require("prosemirror-menu")
const {Schema, DOMParser} = require("prosemirror-model")
const {schema} = require("prosemirror-schema-basic")
const {exampleSetup, buildMenuItems} = require("prosemirror-example-setup")
const {crel} = require("crel")
const {InputRule, inputRules} = require("prosemirror-inputrules")

const dinos = ["brontosaurus", "stegosaurus", "triceratops", "tyrannosaurus", "pterodactyl"]

const dino = {
  attrs: {type: {default: "brontosaurus"}},
  toDOM: node => ["img", {"dino-type": node.attrs.type,
                          src: "/img/dino/" + node.attrs.type + ".png",
                          title: node.attrs.type,
                          class: "dinosaur"}],
  parseDOM: [{
    tag: "img[dino-type]",
    getAttrs: dom => {
      let type = dom.getAttribute("dino-type")
      if (dinos.indexOf(type) > -1) return {type}
    },
    group: "inline"
  }]
}

const dinoSchema = new Schema({
  nodes: schema.nodeSpec.addBefore("image", "dino", dino),
  marks: schema.markSpec
})
const dinoType = dinoSchema.nodes.dino

const dinoInputRule = new InputRule(new RegExp("\\[(" + dinos.join("|") + ")\\]$"), "]", (view, match, start, end) =>
  pm.tr.replaceWith(start, end, dinoType.create({type: match[1]})))

let menu = buildMenuItems(dinoSchema)
menu.insertMenu.content = menu.insertMenu.content.concat(dinos.map(name => {
  return new MenuItem({
    title: "Insert " + name,
    label: name,
    select(state) { return canInsert(state, dinoType) },
    run(state, onAction) { onAction(state.tr.replaceSelection(dinoType.create({type: name})).action()) }
  })
}))

let view = new MenuBarEditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(dinoSchema).parse(document.querySelector("#content")),
    plugins: [exampleSetup({schema: dinoSchema}), inputRules({rules: [dinoInputRule]})]
  }),
  onAction: action => view.updateState(view.editor.state.applyAction(action))
})
window.pm = view.editor

/*
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
  Tab: () => {
    if (open) open()
    else return false
  }
}))
*/
