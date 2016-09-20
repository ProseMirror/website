const {Schema} = require("prosemirror-model")
const {schema: base} = require("prosemirror-schema-basic")
const {addListNodes} = require("prosemirror-schema-list")

exports.schema = new Schema({
  nodes: addListNodes(base.nodeSpec, "paragraph block*", "block"),
  marks: base.markSpec
})
