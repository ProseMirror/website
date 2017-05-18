!{"title": "ProseMirror Document Guide",
  "template": "guide"}

# Guide to the Document Data Structure

ProseMirror defines a set of data structures (in the
[prosemirror-model module](##model)) to represent documents. This
guide explains those data structures.

## Structure

A ProseMirror document is tree-shaped, much like the
[browser DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model).
Documents are made up of [nodes](##model.Node), each
of which contains a [fragment](##model.Fragment) containing zero
or more child nodes.

Each node is context-free, and does not know anything about its parent
nodes. In fact, a node may be shared between multiple documents or
even appear multiple times in a single document.

An important difference between the DOM and ProseMirror's data model
is that inline content is *flat* in a ProseMirror document. The tree
shape is not used to represent things like strong or emphasized text.
Instead, text (and other inline content) can have [marks](##model.Mark)
associated with it to indicate such styling. In HTML, you'd have this:

    <p>This is <strong>strong text with <em>emphasis</em></strong></p>

Conceptually, the structure of the corresponding ProseMirror paragraph
looks like this:

    <p>
      <span>This is </span>
      <span marks="strong">strong text with </span>
      <span marks="strong em">emphasis</span>
    </p>

It is flat. This more closely matches the way we tend to think about
and work with such text. It allows us to represent positions in a
paragraph using a character offset rather than a path in a tree, and
makes it easier to perform operations like splitting or changing the
style of the content without performing awkward tree manipulation.

A full document is just a node. The document content is represented as
the top-level node's child nodes. Often, it'll contain a series of
block nodes, some of which may be textblocks that contain inline
content. But the top-level node may also be a textblock itself, so
that the document contains only inline content.

What kind of node is allowed where is determined by the document's
[schema](schema.html).

## Nodes

Each [node](##model.Node) has a [type](##model.Node.type). This is an
[object](##model.NodeType) containing information about the type of node
that this is, including its [name](##model.NodeType.name), various flags
that indicate its role ([`isBlock`](##model.NodeType.isBlock),
[`isTextblock`](##model.NodeType.isTextblock),
[`isInline`](##model.NodeType.isInline), [`isText`](##model.NodeType.isText)).

Each type may have [attributes](##model.NodeType.attrs) associated
with it, which are values [stored](##model.Node.attrs) in every node
of that type that provide more information about the node. For
example, an [image](##model.Image) node might store its image URL in
an attribute named `src`.

In addition, nodes come with an array of [marks](##model.Mark), which
can add information like [emphasis](##model.EmMark) or being a
[link](##model.LinkMark).

All nodes have a `content` property containing a [fragment
object](##model.Fragment), a collection of child nodes. For nodes that
don't allow content, it will simply be empty.

Type, attributes, marks, and content are the data that make up a
normal node obect. Text nodes also have a [`text`](##model.Node.text)
property containing their text value.

## Traversing

There are various ways in which you can run over the content of a
node. For single-level traversal, the easiest way is to use the
[`forEach`](##model.Node.forEach) method, which, much like
`Array.forEach`, will call your function for each child node.

For iteration that isn't simply start-to-end, you can use indexing.
The [`child`](##model.Node.child) method gives you the child at a given
offset, and the [`childCount`](##model.Node.childCount) property tells you
how many a node has.

To run over all nodes between a pair of positions, the
[`nodesBetween`](##model.Node.nodesBetween) method can be convenient.
It will call a function for each descendant node in the given range.

## Indexing

Positions in a document are represented as integers, indicating the
amount of “tokens” that come before the given position. These tokens
don't actually exist as objects, they are just a counting convention.

 * The start of the document, right before the first content, is
   position 0.

 * Entering or leaving a node that can have content counts as one
   token. So if the document starts with a paragraph, the start of
   that paragraph counts as position 1.

 * Each character counts as one token. So if the paragraph at the
   start of the document contains the word “hi”, position 2 is after
   the “h”, position 3 after the “i”, and position 4 after the whole
   paragraph.

 * Leaf nodes that do not allow content (such as images) count as a
   single token.

Interpreting such position involves quite a lot of counting. You can
call [`Node.resolve`](##model.Node.resolve) to get a more descriptive
[data structure](##model.ResolvedPos) for a position. This data
structure will tell you what the parent node of the position it, what
its offset into that parent is, what ancestors the parent has, and a
few other things.

Take good care to distinguish between child indices (as per
[`childCount`](##model.Node.childCount)), document-wide positions, and
node-local offsets (sometimes used in recursive functions to represent
a position into the node that's currently being handled).

## Changing

ProseMirror represents its documents as
[persistent](https://en.wikipedia.org/wiki/Persistent_data_structure)
data structures. That means, you should **never mutate them**. If you
have a handle to a document (or node, or fragment) that object will
stay the same.

This has a bunch of advantages. It makes it impossible to have an
editor in an invalid intermediate state, since a new document can be
swapped in instantaneously. It also makes it easier to reason about
documents in a mathematical-like way, which is really hard if your
values keep changing underneath you. For example, it allows
ProseMirror to run a very efficient DOM
[update](##view.EditorView.update) algorithm by comparing the last
document it drew to the screen to the current document.

To create an updated version of a whole document, you'll usually want
to use [`Node.replace`](##model.Node.replace), which replaces a given
range of the document with a [“slice”](##model.Slice) of new content.

To update a node shallowly, you can use its
[`copy`](##model.Node.copy) method, which creates a similar node with
new content. Fragments also have various updating methods, such as
[`replaceChild`](##model.Fragment.replaceChild) or
[`append`](##model.Fragment.append).

Or, if you need to leave a record of your changes (which is necessary
when the document is in an editor), you'll go through the
[transform](../transform/) interface instead, which provides
convenience methods for common types of transformations, and will
immediately create a new document for every step.

So this is going to break things:

    doc.nodeAt(pos).text += "!" // BAD!

Whereas this works:

    new Transform(doc).insertText(pos, "!")
