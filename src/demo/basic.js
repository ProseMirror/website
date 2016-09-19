const {EditorState} = require("prosemirror-state")
const {MenuBarEditorView} = require("prosemirror-menu")
const {DOMParser, Schema} = require("prosemirror-model")
const {schema: baseSchema} = require("prosemirror-schema-basic")
const {addListNodes} = require("prosemirror-schema-list")
const {exampleSetup} = require("prosemirror-example-setup")

const schema = new Schema({
  nodes: addListNodes(baseSchema.nodeSpec, "paragraph block*", "block"),
  marks: baseSchema.markSpec
})

let content = document.querySelector("#content")
content.style.display = "none"

let view = new MenuBarEditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(schema).parse(content),
    plugins: [exampleSetup({schema})]
  }),
  onAction: action => view.updateState(view.editor.state.applyAction(action))
})
