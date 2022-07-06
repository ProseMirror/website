!{"template": "example", "title": "ProseMirror schema example"}

# Schemas from scratch

ProseMirror [schemas](/docs/guide/#schema) provide something like a
syntax for documents—they set down which structures are valid.

The most simple schema possible allows the document to be composed
just of text.

PART(textSchema)

You can use it to edit inline content. <span id="text-editor"></span>
(A ProseMirror view can be [mounted](##view.EditorView.constructor) on
any node, including inline nodes.)

## Blocks

To add more structure, you'll usually want to add some kind of block
nodes. For example, this schema consists of notes that can
optionally be grouped with group nodes.

PART(noteSchema)

For nodes that aren't text or top-level nodes, it is
[necessary](/docs/guide/#schema.serialization_and_parsing) to provide
[`toDOM`](##model.NodeSpec.toDOM) methods, so that the editor can
render them, and [`parseDOM`](##model.NodeSpec.parseDOM) values, so
that they can be parsed. This schema uses custom DOM nodes `<note>`
and `<notegroup>` to represent its nodes.

@HTML:note

You can press ctrl-space to add a group around the
selected notes. To get that functionality, you first have to implement
a custom [editing command](/docs/guide/#commands). Something like
this:

PART(makeNoteGroup)

A [keymap](##keymap) like `keymap({"Ctrl-Space": makeNoteGroup})` can
be used to enable it.

The [generic bindings](##commands.baseKeymap) for enter and backspace
work just fine in this schema—enter will split the textblock around
the cursor, or if that's empty, try to lift it out of its parent node,
and thus can be used to create new notes and escape from a note group.
Backspace at the start of a textblock will lift that textblock out of
its parent, which can be used to remove notes from a group.

## Groups and marks

Let's do one more, with stars and shouting.

This schema has not just text as inline content, but also _stars_,
which are just inline nodes. To be able to easily refer to both our
inline nodes, they are tagged as a group (also called `"inline"`). The
schema does the same for the two types of block nodes, one paragraph
type that allows any inline content, and one that only allows unmarked
text.

PART(starSchema_1)

Since textblocks allow marks by default, the `boring_paragraph` type
sets [`marks`](##model.NodeSpec.marks) to the empty string to
explicitly forbid them.

The schema defines two types of marks, shouted text and links. The
first is like the common strong or emphasis marks, in that it just
adds a single bit of information to the content it marks, and doesn't
have any attributes. It specifies that it should be rendered as a
`<shouting>` tag (which is styled to be inline, bold, and uppercase),
and that that same tag should be parsed as this mark.

PART(starSchema_2)

Links do have an attribute—their target URL, so their DOM serializing
method has to output that (the second element in an array returned
from `toDOM`, if it's a plain object, provides a set of DOM
attributes), and their DOM parser has to read it.

By default, marks are _inclusive_, meaning that they get applied to
content inserted at their end (as well as at their start when they
start at the start of their parent node). For link-type marks, this is
usually not the expected behavior, and the
[`inclusive`](##model.MarkSpec.inclusive) property on the mark spec
can be set to false to disable that behavior.

@HTML:star

To make it possible to interact with these elements we again have to
add a custom keymap. There's a command helper for toggling marks,
which we can use directly for the shouting mark.

PART(starKeymap)

Toggling a link is a little more involved. En- or disabling
non-inclusive marks when nothing is selected isn't meaningful, since
you can't “type into’ them like you can with inclusive marks. And we
need to ask the user for a URL—but only if a link is being added. So
the command uses [`rangeHasMark`](##model.Node.rangeHasMark) to check
whether it will be adding or removing, before prompting for a URL.

(`prompt` is probably not what you'd want to use in a real system.
When using an asynchronous method to query the user for something,
make sure to use the _current_ state, not the state when the command
was originally called, when applying the command's effect.)

PART(toggleLink)

The command that inserts a star first checks whether the schema allows
one to be inserted at the cursor position (using
[`canReplaceWith`](##model.Node.canReplaceWith)), and if so, replaces
the selection with a newly created star node.

PART(insertStar)
