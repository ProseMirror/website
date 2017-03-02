const {EditorState} = require("prosemirror-state")
const {MenuBarEditorView} = require("prosemirror-menu")
const {DOMParser} = require("prosemirror-model")
const {schema} = require("prosemirror-schema-basic")
const {exampleSetup} = require("prosemirror-example-setup")

let view = window.view = new MenuBarEditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(schema).parse(document.querySelector("#content")),
    plugins: exampleSetup({schema})
  })
})
