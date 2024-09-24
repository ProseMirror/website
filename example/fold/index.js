// schema{
import {Schema} from "prosemirror-model"
import {schema as basicSchema} from "prosemirror-schema-basic"

const schema = new Schema({
  nodes: basicSchema.spec.nodes.append({
    doc: {
      content: "section+"
    },
    section: {
      content: "heading block+",
      parseDOM: [{tag: "section"}],
      toDOM() { return ["section", 0] }
    }
  }),
  marks: basicSchema.spec.marks
})
// }

// nodeview{
class SectionView {
  constructor(node, view, getPos, deco) {
    this.dom = document.createElement("section")
    this.header = this.dom.appendChild(document.createElement("header"))
    this.header.contentEditable = "false" 
    this.foldButton = this.header.appendChild(document.createElement("button"))
    this.foldButton.title = "Toggle section folding"
    this.foldButton.onmousedown = e => this.foldClick(view, getPos, e)
    this.contentDOM = this.dom.appendChild(document.createElement("div"))
    this.setFolded(deco.some(d => d.spec.foldSection))
  }

  setFolded(folded) {
    this.folded = folded
    this.foldButton.textContent = folded ? "▿" : "▵"
    this.contentDOM.style.display = folded ? "none" : ""
  }

  update(node, deco) {
    if (node.type.name != "section") return false
    let folded = deco.some(d => d.spec.foldSection)
    if (folded != this.folded) this.setFolded(folded)
    return true
  }

  foldClick(view, getPos, event) {
    event.preventDefault()
    setFolding(view, getPos(), !this.folded)
  }
}
// }

// plugin{
import {Plugin} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

const foldPlugin = new Plugin({
  state: {
    init() { return DecorationSet.empty },
    apply(tr, value) {
      value = value.map(tr.mapping, tr.doc)
      let update = tr.getMeta(foldPlugin)
      if (update && update.fold) {
        let node = tr.doc.nodeAt(update.pos)
        if (node && node.type.name == "section")
          value = value.add(tr.doc, [Decoration.node(update.pos, update.pos + node.nodeSize, {}, {foldSection: true})])
      } else if (update) {
        let found = value.find(update.pos + 1, update.pos + 1)
        if (found.length) value = value.remove(found)
      }
      return value
    }
  },
  props: {
    decorations: state => foldPlugin.getState(state),
    nodeViews: {section: (node, view, getPos, decorations) => new SectionView(node, view, getPos, decorations)}
  }
})
// }

// setFolding{
import {Selection} from "prosemirror-state"

function setFolding(view, pos, fold) {
  let section = view.state.doc.nodeAt(pos)
  if (section && section.type.name == "section") {
    let tr = view.state.tr.setMeta(foldPlugin, {pos, fold})
    let {from, to} = view.state.selection, endPos = pos + section.nodeSize
    if (from < endPos && to > pos) {
      let newSel = Selection.findFrom(view.state.doc.resolve(endPos), 1) ||
        Selection.findFrom(view.state.doc.resolve(pos), -1)
      if (newSel) tr.setSelection(newSel)
    }
    view.dispatch(tr)
  }
}
// }

// editor{
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {exampleSetup} from "prosemirror-example-setup"

window.view = new EditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc: schema.node("doc", null, [
      schema.node("section", null, [
        schema.node("heading", {level: 1}, [schema.text("One")]),
        schema.node("paragraph", null, [schema.text("This is the first section. Click the top right corner to collapse it.")])
      ]),
      schema.node("section", null, [
        schema.node("heading", {level: 1}, [schema.text("Two")]),
        schema.node("paragraph", null, [schema.text("Here's another section.")])
      ])
    ]),
    plugins: exampleSetup({schema}).concat(foldPlugin)
  })
})
// }
