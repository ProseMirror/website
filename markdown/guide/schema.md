Each ProseMirror [document](#doc) has a [schema](##model.Schema)
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

Every node in a document has a [type](##model.NodeType), which
represents its semantic meaning and its properties, such as the way it
is rendered in the editor.

When you define a schema, you enumerate the node types that may occur
within it, describing each with a [spec object](##model.NodeSpec):

```javascript
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

Every schema must at least define a top-level node type (which
defaults to the name `"doc"`, but you can
[configure](##model.Schema.topNodeType) that), and a `"text"` type for
text content.

Nodes that count as inline must declare this with the
[`inline`](##model.NodeSpec.inline) property (though for the `text`
type, which is inline by definition, you may omit this).

## Content Expressions

The strings in the [`content`](##model.NodeSpec.content) fields in the
example schema above are called _content expressions_. They control
what sequences of child nodes are valid for this node type.

You can say, for example `"paragraph"` for “one paragraph”, or
`"paragraph+"` to express “one or more paragraphs”. Similarly,
`"paragraph*"` means “zero or more paragraphs” and `"caption?"` means
“zero or one caption node”. You can also use regular-expression-like
ranges, such as `{2}` (“exactly two”) `{1, 5}` (“one to five”) or
`{2,}` (“two or more”) after node names.

Such expressions can be combined to create a sequence, for example
`"heading paragraph+"` means ‘first a heading, then one or more
paragraphs’. You can also use the pipe `|` operator to indicate a
choice between two expressions, as in `"(paragraph | blockquote)+"`.

Some groups of element types will appear multiple types in your
schema—for example you might have a concept of “block” nodes, that may
appear at the top level but also nested inside of blockquotes. You can
create a node group by giving your node specs a
[`group`](##model.NodeSpec.group) property, and then refer to that
group by its name in your expressions.

```javascript
const groupSchema = new Schema({
  nodes: {
    doc: {content: "block+"},
    paragraph: {group: "block", content: "text*"},
    blockquote: {group: "block", content: "block+"},
    text: {}
  }
})
```

Here `"block+"` is equivalent to `"(paragraph | blockquote)+"`.

It is recommended to always require at least one child node in nodes
that have block content (such as `"doc"` and `"blockquote"` in the
example above), because browsers will 

The order in which your nodes appear in an or-expression is
significant. When creating a default instance for a non-optional node,
for example to make sure a document still conforms to the schema after
a [replace step](##transform.ReplaceStep) the first type in the
expression will be used. If that is a group, the first type in the
group (determined by the order in which the group's members appear in
your `nodes` map) is used. If I switched the positions of
`"paragraph"` and `"blockquote"` in the the example schema, you'd get
a stack overflow as soon as the editor tried to create a block
node—it'd create a `"blockquote"` node, whose content requires at
least one block, so it'd try to create another `"blockquote"` as
content, and so on.

Not every node-manipulating function in the library checks that it is
dealing with valid content—higher level concepts like
[transforms](#transform) do, but primitive node-creation methods
usually don't and instead put the responsibility for providing sane
input on their caller. It is perfectly possible to use, for example
[`NodeType.create`](##model.NodeType^create), to create a node with
invalid content. For nodes that are ‘open’ on the edge of
[slices](#doc.slices), this is even a reasonable thing to do. There
is a separate [`createChecked`
method](##model.NodeType^createChecked), as well as an after-the-fact
[`check` method](##model.Node.check) that can be used to assert that a
given node's content is valid.

## Marks

Marks are used to add extra styling or other information to inline
content. A schema must declare all mark types it allows in its
[schema](##model.Schema). [Mark types](##model.MarkType) are objects
much like node types, used to tag mark objects and provide additional
information about them.

By default, nodes with inline content allow all marks defined in the
schema to be applied to their children. You can configure this with
the [`marks`](##model.NodeSpec.marks) property on your node spec.

Here's a simple schema that supports strong and emphasis marks on
text in paragraphs, but not in headings:

```javascript
const markSchema = new Schema({
  nodes: {
    doc: {content: "block+"},
    paragraph: {group: "block", content: "text*", marks: "_"},
    heading: {group: "block", content: "text*", marks: ""},
    text: {inline: true}
  },
  marks: {
    strong: {},
    em: {}
  }
})
```

The set of marks is interpreted as a space-separated string of mark
names or mark groups—`"_"` acts as a wildcard, and the empty string
corresponds to the empty set.

## Attributes

The document schema also defines which _attributes_ each node or mark
has. If your node type requires extra node-specific information to be
stored, such as the level of a heading node, that is best done with an
attribute.

Attribute sets are represented as plain objects with a predefined (per
node or mark) set of properties holding any JSON-serializeable values.
To specify what attributes it allows, use the optional `attrs` field
in a node or mark spec.

```javascript
  heading: {
    content: "text*",
    attrs: {level: {default: 1}}
  }
```

In this schema, every instance of the `heading` node will have a
`level` attribute under `.attrs.level`. If it isn't specified when the
node is [created](##model.NodeType^create), it will default to 1.

When you don't give a default value for an attribute, an error will be
raised when you attempt to create such a node without specifying that
attribute. It will also make it impossible for the library to generate
such nodes as filler to satisfy schema constraints during a transform
or when calling [`createAndFill`](##model.NodeType^createAndFill).

## Serialization and Parsing

In order to be able to edit them in the browser, it must be possible
to represent document nodes in the browser DOM. The easiest way to do
that is to include information about each node's DOM representation in
the schema using the [`toDOM` field](##model.NodeSpec.toDOM) in the
node spec.

This field should hold a function that, when called with the node as
argument, returns a description of the DOM structure for that node.
This may either be a direct DOM node or an [array describing
it](##model.DOMOutputSpec), for example:

```javascript
const schema = new Schema({
  nodes: {
    doc: {content: "paragraph+"},
    paragraph: {
      content: "text*",
      toDOM(node) { return ["p", 0] }
    },
    text: {}
  }
})
```

The expression `["p", 0]` declares that a paragraph is rendered as an
HTML `<p>` tag. The zero is the ‘hole’ where its content should be
rendered. You may also include an object with HTML attributes after
the tag name, for example `["div", {class: "c"}, 0]`. Leaf nodes don't
need a hole in their DOM representation, since they don't have
content.

Mark specs allow a similar [`toDOM`](##model.MarkSpec.toDOM) method,
but they are required to render as a single tag that directly wraps
the content, so the content always goes directly in the returned node,
and the hole doesn't need to be specified.

You'll also often need to _parse_ a document from DOM data, for
example when the user pastes or drags something into the editor. The
model module also comes with functionality for that, and you are
encouraged to include parsing information directly in your schema with
the [`parseDOM` property](##model.NodeSpec.parseDOM).

This may list an array of [_parse rules_](##model.ParseRule), which
describe DOM constructs that map to a given node or mark. For example,
the basic schema has these for the emphasis mark:

```javascript
  parseDOM: [
    {tag: "em"},          // Match <em> nodes
    {tag: "i"},           // and <i> nodes
    {style: "font-style", // and inline font-style: italic
     getAttrs: value => value == "italic" ? {} : undefined}
  ]
```

The value given to [`tag`](##model.ParseRule.tag) in a parse rule can
be a CSS selector, so you can do thing like `"div.myclass"` too. The
[`getAttrs` property](##model.ParseRule.getAttrs) will be used to
compute the attributes for the mark or node. In the example above it
is used as a filter, to only match italic font style rules, and
prevent the match by returning `undefined` otherwise.

When a schema includes `parseDOM` annotations, you can create a
[`DOMParser`](##model.DOMParser) object for it with
[`DOMParser.fromSchema`](##model.DOMParser^fromSchema). This is done
by the editor to create a the default clipboard parser, but you can
also [override](##view.EditorProps.clipboardParser) that.

Documents also come with a built-in JSON serialization format. You can
call [`toJSON`](##model.Node.toJSON) on them to get an object that can
safely be passed to
[`JSON.stringify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify),
and schema objects have a [`fromJSON` method](##model.Schema.fromJSON)
that can parse this representation back into a document.

## Extending a schema

The `nodes` and `marks` options passed to the [`Schema`
constructor](##model.Schema) take [`OrderedMap`
objects](https://github.com/marijnh/orderedmap#readme) as well as
plain JavaScript objects. The resulting schema's
[`nodeSpec`](##model.Schema.nodeSpec) and
[`markSpec`](##model.Schema.markSpec) properties are always
`OrderedMap`s, which can be used as the basis for further schemas.

Such maps support a number of methods to conveniently create updated
versions. For example you could say
`schema.markSpec.remove("blockquote")` to derive a set of nodes
without the `blockquote` node, which can then be passed as the `nodes`
field for a new schema.

The [schema-list](##schema-list) module exports a [convenience
method](##schema-list.addListNodes) to add the nodes exported by those
modules to a nodeset.
