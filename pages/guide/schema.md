!{"title": "ProseMirror Document Guide",
  "template": "guide"}

# Guide to Document Schemas

Each ProseMirror editor and [document](doc.html) has a
[schema](##Schema) associated with it. The schema describes the kind
of [nodes](##Node) that may occur in the document, and the way they
are nested. For example, it might say that the top-level node can
contain one or more blocks, and that paragraph nodes can contain any
number of inline nodes, with any [marks](##Mark) applied to them.

The library comes with a [default schema](##defaultSchema), but the
nice thing about ProseMirror is that it allows you to define your own
schemas.

## Node Types

Every node in a document has a [type](##NodeType), which represents
its semantic meaning and its properties, such as the way it is
rendered in the editor. Individual node types are classes that inherit
from one of these subclasses of [`NodeType`](##NodeType):

 * [`Block`](##Block) for block-level nodes.

 * [`Textblock`](##Textblock) (extends [`Block`](##Block)) for nodes
   that are themselves blocks but contain inline content.

 * [`Inline`](##Inline) for inline (paragraph-level) nodes.

When you define a schema, you enumerate the node types that may occur
within it, along with the nodes each of them may have as content.

```
const trivialSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "paragraph+"},
    paragraph: {type: Paragraph, content: "text*"},
    text: {type: Text},
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
`{2,}` (“two or more”) after node names.

Often, you'll want not just a single node type, but any of a set of
node types, to appear in a position. You can use parentheses and the
pipe `|` operator (for “or”) to express this. For example `"(paragraph
| blockquote)+"` means “one or more paragraphs or blockquote nodes”.

Some groups of element types will appear multiple types in your
schema—for example you might have a concept of “block” nodes, that may
appear at the top level but also nested inside of blockquotes. If you
include a `groups` property in your schema definition
[spec](##SchemaSpec), the groups defined there can be referred to in
content expressions.

```
const groupSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "block+"},
    paragraph: {type: Paragraph, content: "text*"},
    blockquote: {type: Blockquote, content: "block+"},
    text: {type: Text}
  },
  groups: {
    block: ["paragraph", "blockquote"]
  }
})
```

Here `"block+"` is equivalent to `"(paragraph | blockquote)+"`. Groups
can also refer to other groups to extend them.

The order of node types in a group is significant. ProseMirror will in
some situations “make up” nodes, in order to make sure the document
remains valid. For elements that are specified as being part of a
group, the first element in the group is the one that will be created.
If I switched the positions of `"paragraph"` and `"blockquote"` in the
group in the example, you'd get a stack overflow as soon as the editor
tried to create a block node—it's create a `"blockquote"` node, whose
content requires at least one block, so it'd create another
`"blockquote"` as content, and so on.

To express “first a heading and then zero or more paragraphs”, you
write `"heading paragraph*"`. Putting expressions after each other
indicates their content must appear in sequence.

Note that parentheses can _only_ be used around `|`-expressions of
node or group names. A content expression is a flat sequence of
element groups (with repeat qualifiers), not an arbitrarily nested
expression. An additional constraint is that adjacent groups must not
overlap (must not contain the same nodes), to make matching efficient
and unambiguous.

By default, nodes do not support [marks][##Mark]. When desired, you
have to explicitly allow them using square bracket syntax. So
`"text*"` means “text without marks”, whereas `"text[em]*"` means
“text with optional emphasis mark”, `"text[em strong]*"` text with
optional strong or emphasis mark, and `"text[_]*"` can be used to say
“text with any of the schema's marks”.

## Marks

Marks are used to add extra styling or other information to inline
content. A schema must declare all mark types it allows in its
[spec](##SchemaSpec). Mark types are classes much like node types,
except that they inherit from [`MarkType`](##MarkType) instead.

Here's a simple schema that supports strong and emphasis marks on
text:

```
const markSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "paragraph+"},
    paragraph: {type: Paragraph, content: "text[_]*"},
    text: {type: Text}
  },
  marks: {
    strong: StrongMark,
    em: EmMark
  }
})
```

## Attributes

FIXME to be filled in

## Serialization and Parsing

FIXME to be filled in
