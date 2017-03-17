const {EditorState} = require("prosemirror-state")
const {insertPoint} = require("prosemirror-transform")
const {EditorView} = require("prosemirror-view")
const {MenuItem} = require("prosemirror-menu")
const {Schema, DOMParser} = require("prosemirror-model")
const {schema} = require("prosemirror-schema-basic")
const {exampleSetup, buildMenuItems} = require("prosemirror-example-setup")
const {InputRule, inputRules} = require("prosemirror-inputrules")

const dinos = ["brontosaurus", "stegosaurus", "triceratops", "tyrannosaurus", "pterodactyl"]

const dino = {
  attrs: {type: {default: "brontosaurus"}},
  draggable: true,
  toDOM: node => ["img", {"dino-type": node.attrs.type,
                          src: "/img/dino/" + node.attrs.type + ".png",
                          title: node.attrs.type,
                          class: "dinosaur"}],
  parseDOM: [{
    tag: "img[dino-type]",
    getAttrs: dom => {
      let type = dom.getAttribute("dino-type")
      if (dinos.indexOf(type) > -1) return {type}
    }
  }],

  inline: true,
  group: "inline"
}

const dinoSchema = new Schema({
  nodes: schema.spec.nodes.addBefore("image", "dino", dino),
  marks: schema.spec.marks
})
const dinoType = dinoSchema.nodes.dino

const dinoInputRule = new InputRule(new RegExp("\\[(" + dinos.join("|") + ")\\]$"), (state, match, start, end) => {
  return state.tr.replaceWith(start, end, dinoType.create({type: match[1]}))
})

let menu = buildMenuItems(dinoSchema)
menu.insertMenu.content = dinos.map(name => new MenuItem({
  title: "Insert " + name,
  label: name.charAt(0).toUpperCase() + name.slice(1),
  select(state) {
    return insertPoint(state.doc, state.selection.from, dinoType) != null
  },
  run(state, dispatch) { dispatch(state.tr.replaceSelectionWith(dinoType.create({type: name}))) }
})).concat(menu.insertMenu.content)

window.view = new EditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(dinoSchema).parse(document.querySelector("#content")),
    plugins: exampleSetup({schema: dinoSchema, menuContent: menu.fullMenu}).concat(inputRules({rules: [dinoInputRule]}))
  })
})
