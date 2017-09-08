// textSchema{
import {Schema} from "prosemirror-model"

const textSchema = new Schema({nodes: {
  text: {},
  doc: {content: "text*"}
}})
// }

// noteSchema{
const noteSchema = new Schema({nodes: {
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
}})
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

import {DOMParser} from "prosemirror-model"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap"
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
start(id("note-editor"), id("note-content"), noteSchema, [keymap({"Mod-Space": makeNoteGroup})])

