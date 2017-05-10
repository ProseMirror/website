!{"title": "ProseMirror Document Guide",
  "template": "guide"}

# Guide to Document Schemas

Each ProseMirror [document](doc.html) has a [schema](##model.Schema)
associated with it. The schema describes the kind of
[nodes](##model.Node) that may occur in the document, and the way they
are nested. For example, it might say that the top-level node can
contain one or more blocks, and that paragraph nodes can contain any
number of inline nodes, with any [marks](##model.Mark) applied to
them.

There is a package with a [basic schema](##schema-basic) available,
but the nice thing about ProseMirror is that it allows you to define
your own schemas.

## Node Types

Every node in a document has a [type](##model.NodeType), which represents
its semantic meaning and its properties, such as the way it is
rendered in the editor.

When you define a schema, you enumerate the node types that may occur
within it, describing each with a [spec object](##model.NodeSpec):

```
const trivialSchema = new Schema({
  nodes: {
    doc: {content: "paragraph+"},
    paragraph: {content: "text*"},
    text: {inline: true},
    /* ... and so on */
  }
})
```

That defines a schema where the document may contain one or more
paragraphs, and each paragraph can contain any amount of text.

Every schema must at least define a `"doc"` type (the top level node)
and a `"text"` type for text content.

## Content Expressions

The strings in the `content` fields in the example schema above are
called _content expressions_. They control what sequences of child
nodes are valid for this node type.

You can say, for example `"paragraph"` for “one paragraph”, or
`"paragraph+"` to express “one or more paragraphs”. Similarly,
`"paragraph*"` means “zero or more paragraphs” and `"caption?"` means
“zero or one caption node”. You can also use regular-expression-like
ranges, such as `{2}` (“exactly two”) `{1, 5}` (“one to five”) or
`{2,}` (“two or more”) after node names. In brace notation, you can
substitute a reference to an [attribute](##model.NodeType.attrs) of the
parent node for any of the numbers. For example `"table_cell{.width}"`
to require that the node contain the number of table cells specified
by the parent node's `width` attribute.

Often, you'll want not just a single node type, but any of a set of
node types, to appear in a position. You can use parentheses and the
pipe `|` operator (for “or”) to express this. For example `"(paragraph
| blockquote)+"` means “one or more paragraphs or blockquote nodes”.

Some groups of element types will appear multiple types in your
schema—for example you might have a concept of “block” nodes, that may
appear at the top level but also nested inside of blockquotes. You can
create a node group by giving your node specs a `group` property, and
then refer to that group by its name in your expressions.

```
const groupSchema = new Schema({
  nodes: {
    doc: {content: "block+"},
    paragraph: {group: "block", content: "text*"},
    blockquote: {group: "block", content: "block+"},
    text: {inline: true}
  }
})
```

Here `"block+"` is equivalent to `"(paragraph | blockquote)+"`.

Note that the order in which your nodes appear in an or-expression is
significant. When creating a placeholder for a non-optional node, for
example to make sure a document is still valid after a
[replace step](##transform.ReplaceStep) the first type in the expression
will be used. If that is a group, the first type in the group
(determined by the order in which the group's members appear in your
`nodes` map) is used. If I switched the positions of `"paragraph"` and
`"blockquote"` in the the example schema, you'd get a stack overflow
as soon as the editor tried to create a block node—it'd create a
`"blockquote"` node, whose content requires at least one block, so
it'd try to create another `"blockquote"` as content, and so on.

To express “first a heading and then zero or more paragraphs”, you
write `"heading paragraph*"`. Putting expressions after each other
indicates their content must appear in sequence.

Note that parentheses can _only_ be used around `|`-expressions of
node or group names. A content expression is a flat sequence of
element groups (with repeat qualifiers), not an arbitrarily nested
expression. An additional constraint is that adjacent groups must not
overlap (must not contain the same nodes), to make matching efficient
and unambiguous.

It is possible to restrict child nodes to have certain attributes,
using square brackets. You can say `"heading[level=1]"` to only allow
level 1 heading nodes. Or even `"some_node[foo=1, bar=\"baz\"]"`, to
restrict multiple attributes. The value after the `=` may be a JSON
atom (string, number, bool, null) or a reference to an attribute in
the parent node, written with a prefixed dot, for example
`"table_row[width=.width]"`.

By default, nodes do not support [marks][##model.Mark]. When desired,
you have to explicitly allow them using angle bracket syntax. So
`"text*"` means “text without marks”, whereas `"text<em>*"` means
“text with optional emphasis mark”, `"text<em strong>*"` text with
optional strong or emphasis mark, and `"text<_>*"` can be used to say
“text with any of the schema's marks”.

## Marks

Marks are used to add extra styling or other information to inline
content. A schema must declare all mark types it allows in its
[schema](##model.Schema). Mark types are classes much like node types,
except that they inherit from [`MarkType`](##model.MarkType) instead.

Here's a simple schema that supports strong and emphasis marks on
text:

```
const markSchema = new Schema({
  nodes: {
    doc: {content: "paragraph+"},
    paragraph: {content: "text<_>*"},
    text: {inline: true}
  },
  marks: {
    strong: StrongMark,
    em: EmMark
  }
})
```

## Extending a schema

The `nodes` and `marks` options passed to the
[`Schema` constructor](##model.Schema) take
[`OrderedMap` objects](https://github.com/marijnh/orderedmap#readme) as well
as plain JavaScript objects. The schema's  [`nodeSpec`](##model.Schema.nodeSpec)
and [`markSpec`](##model.Schema.markSpec) properties are always `OrderedMap`s.

These support a number of methods to conveniently update them when
building a new schema. For example you could say
`schema.markSpec.remove("blockquote")` to derive a set of nodes
without the `blockquote` node, which can then be passed as the `nodes`
field for a new schema.

The [schema-list](##schema-list) and [schema-table](##schema-table)
modules both export a [convenience](##schema-list.addListNodes)
[function](##schema-table.addTableNodes) to add the nodes exported by
those modules to a nodeset.

## Attributes

FIXME to be filled in

## Serialization and Parsing

FIXME to be filled in
