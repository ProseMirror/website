// schema{
import {schema} from "prosemirror-schema-basic"
import {Schema} from "prosemirror-model"

const footnoteSpec = {
  group: "inline",
  content: "text*",
  inline: true,
  // This makes the view treat the node as a leaf, even though it
  // technically has content
  atom: true,
  toDOM: () => ["footnote", 0],
  parseDOM: [{tag: "footnote"}]
}

const footnoteSchema = new Schema({
  nodes: schema.spec.nodes.addBefore("image", "footnote", footnoteSpec),
  marks: schema.spec.marks
})
// }

// menu{
import {insertPoint} from "prosemirror-transform"
import {MenuItem} from "prosemirror-menu"
import {buildMenuItems} from "prosemirror-example-setup"
import {Fragment} from "prosemirror-model"

let menu = buildMenuItems(footnoteSchema)
menu.insertMenu.content.push(new MenuItem({
  title: "Insert footnote",
  label: "Footnote",
  select(state) {
    return insertPoint(state.doc, state.selection.from, footnoteSchema.nodes.footnote) != null
  },
  run(state, dispatch) {
    let {empty, $from, $to} = state.selection, content = Fragment.empty
    if (!empty && $from.sameParent($to) && $from.parent.inlineContent)
      content = $from.parent.content.cut($from.parentOffset, $to.parentOffset)
    dispatch(state.tr.replaceSelectionWith(footnoteSchema.nodes.footnote.create(null, content)))
  }
}))
// }

// nodeview_start{
import {StepMap} from "prosemirror-transform"
import {keymap} from "prosemirror-keymap"
import {undo, redo} from "prosemirror-history"

class FootnoteView {
  constructor(node, view, getPos) {
    // We'll need these later
    this.node = node
    this.outerView = view
    this.getPos = getPos

    // The node's representation in the editor (empty, for now)
    this.dom = document.createElement("footnote")
    // These are used when the footnote is selected
    this.innerView = null
  }
// }
// nodeview_select{
  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode")
    if (!this.innerView) this.open()
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode")
    if (this.innerView) this.close()
  }
// }
// nodeview_open{
  open() {
    // Append a tooltip to the outer node
    let tooltip = this.dom.appendChild(document.createElement("div"))
    tooltip.className = "footnote-tooltip"
    // And put a sub-ProseMirror into that
    this.innerView = new EditorView(tooltip, {
      // You can use any node as an editor document
      state: EditorState.create({
        doc: this.node,
        plugins: [keymap({
          "Mod-z": () => undo(this.outerView.state, this.outerView.dispatch),
          "Mod-y": () => redo(this.outerView.state, this.outerView.dispatch)
        })]
      }),
      // This is the magic part
      dispatchTransaction: this.dispatchInner.bind(this),
      handleDOMEvents: {
        mousedown: () => {
          // Kludge to prevent issues due to the fact that the whole
          // footnote is node-selected (and thus DOM-selected) when
          // the parent editor is focused.
          if (this.outerView.hasFocus()) this.innerView.focus()
        }
      }
    })
  }

  close() {
    this.innerView.destroy()
    this.innerView = null
    this.dom.textContent = ""
  }
// }
// nodeview_dispatchInner{
  dispatchInner(tr) {
    let {state, transactions} = this.innerView.state.applyTransaction(tr)
    this.innerView.updateState(state)

    if (!tr.getMeta("fromOutside")) {
      let outerTr = this.outerView.state.tr, offsetMap = StepMap.offset(this.getPos() + 1)
      for (let i = 0; i < transactions.length; i++) {
        let steps = transactions[i].steps
        for (let j = 0; j < steps.length; j++)
          outerTr.step(steps[j].map(offsetMap))
      }
      if (outerTr.docChanged) this.outerView.dispatch(outerTr)
    }
  }
// }
// nodeview_update{
  update(node) {
    if (!node.sameMarkup(this.node)) return false
    this.node = node
    if (this.innerView) {
      let state = this.innerView.state
      let start = node.content.findDiffStart(state.doc.content)
      if (start != null) {
        let {a: endA, b: endB} = node.content.findDiffEnd(state.doc.content)
        let overlap = start - Math.min(endA, endB)
        if (overlap > 0) { endA += overlap; endB += overlap }
        this.innerView.dispatch(
          state.tr
            .replace(start, endB, node.slice(start, endA))
            .setMeta("fromOutside", true))
      }
    }
    return true
  }
// }
// nodeview_end{
  destroy() {
    if (this.innerView) this.close()
  }

  stopEvent(event) {
    return this.innerView && this.innerView.dom.contains(event.target)
  }

  ignoreMutation() { return true }
}
// }

// editor{
import {EditorState} from "prosemirror-state"
import {DOMParser} from "prosemirror-model"
import {EditorView} from "prosemirror-view"
import {exampleSetup} from "prosemirror-example-setup"

window.view = new EditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(footnoteSchema).parse(document.querySelector("#content")),
    plugins: exampleSetup({schema: footnoteSchema, menuContent: menu.fullMenu})
  }),
  nodeViews: {
    footnote(node, view, getPos) { return new FootnoteView(node, view, getPos) }
  }
})
// }
