// textSchema{
import {Schema} from "prosemirror-model"

const textSchema = new Schema({
  nodes: {
    text: {},
    doc: {content: "text*"}
  }
})
// }

// noteSchema{
const noteSchema = new Schema({
  nodes: {
    text: {},
    note: {
      content: "text*",
      toDOM() { return ["note", 0] },
      parseDOM: [{tag: "note"}]
    },
    notegroup: {
      content: "note+",
      toDOM() { return ["notegroup", 0] },
      parseDOM: [{tag: "notegroup"}]
    },
    doc: {
      content: "(note | notegroup)+"
    }
  }
})
// }

// makeNoteGroup{
import {findWrapping} from "prosemirror-transform"

function makeNoteGroup(state, dispatch) {
  // Get a range around the selected blocks
  let range = state.selection.$from.blockRange(state.selection.$to)
  // See if it is possible to wrap that range in a note group
  let wrapping = findWrapping(range, noteSchema.nodes.notegroup)
  // If not, the command doesn't apply
  if (!wrapping) return false
  // Otherwise, dispatch a transaction, using the `wrap` method to
  // create the step that does the actual wrapping.
  if (dispatch) dispatch(state.tr.wrap(range, wrapping).scrollIntoView())
  return true
}
// }

// starSchema_1{
let starSchema = new Schema({
  nodes: {
    text: {
      group: "inline",
    },
    star: {
      inline: true,
      group: "inline",
      toDOM() { return ["star", "🟊"] },
      parseDOM: [{tag: "star"}]
    },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM() { return ["p", 0] },
      parseDOM: [{tag: "p"}]
    },
    boring_paragraph: {
      group: "block",
      content: "text*",
      marks: "",
      toDOM() { return ["p", {class: "boring"}, 0] },
      parseDOM: [{tag: "p.boring", priority: 60}]
    },
    doc: {
      content: "block+"
    }
  },
// }
// starSchema_2{
  marks: {
    shouting: {
      toDOM() { return ["shouting", 0] },
      parseDOM: [{tag: "shouting"}]
    },
    link: {
      attrs: {href: {}},
      toDOM(node) { return ["a", {href: node.attrs.href}, 0] },
      parseDOM: [{tag: "a", getAttrs(dom) { return {href: dom.href} }}],
      inclusive: false
    }
  }
})
// }

// starKeymap{
import {toggleMark} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap"

let starKeymap = keymap({
  "Ctrl-b": toggleMark(starSchema.marks.shouting),
  "Ctrl-q": toggleLink,
  "Ctrl-Space": insertStar
})
// }
// toggleLink{
function toggleLink(state, dispatch) {
  let {doc, selection} = state
  if (selection.empty) return false
  let attrs = null
  if (!doc.rangeHasMark(selection.from, selection.to, starSchema.marks.link)) {
    attrs = {href: prompt("Link to where?", "")}
    if (!attrs.href) return false
  }
  return toggleMark(starSchema.marks.link, attrs)(state, dispatch)
}
// }
// insertStar{
function insertStar(state, dispatch) {
  let type = starSchema.nodes.star
  let {$from} = state.selection
  if (!$from.parent.canReplaceWith($from.index(), $from.index(), type))
    return false
  dispatch(state.tr.replaceSelectionWith(type.create()))
  return true
}
// }

import {DOMParser} from "prosemirror-model"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {baseKeymap} from "prosemirror-commands"
import {history, undo, redo} from "prosemirror-history"

let histKeymap = keymap({"Mod-z": undo, "Mod-y": redo})

function start(place, content, schema, plugins = []) {
  let doc = DOMParser.fromSchema(schema).parse(content)
  return new EditorView(place, {
    state: EditorState.create({
      doc,
      plugins: plugins.concat([histKeymap, keymap(baseKeymap), history()])
    })
  })
}

function id(str) { return document.getElementById(str) }

start({mount: id("text-editor")}, id("text-content"), textSchema)
start(id("note-editor"), id("note-content"), noteSchema, [keymap({"Ctrl-Space": makeNoteGroup})])
start(id("star-editor"), id("star-content"), starSchema, [starKeymap])
