!{"title": "ProseMirror Document Guide",
  "template": "guide"}

# Guide to the Document Data Structure

ProseMirror defines a set of data structures (in the
[model module](##model)) to represent documents. This guide explains
the basics of those data structures.

## Structure

A ProseMirror document is tree-shaped, much like the
[browser DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model).
Documents are made up of [nodes](##Node), each
of which contains a [fragment](##Fragment) containing zero
or more child nodes.

Each node is context-free, and does not know anything about its parent
nodes. In fact, a node may be shared between multiple documents or
even appear multiple times in a single document.

An important difference between the DOM and ProseMirror's data model
is that inline content is *flat* in a ProseMirror document. The tree
shape is not used to represent things like strong or emphasized text.
Instead, text (and other inline content) can have [marks](##Mark)
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

A full document is just a node, usually of type [`Doc`](##Doc). This
can contain any number of [block](##Block) nodes, which may in turn
contain further block nodes, or which may be [textblocks](##Textblock)
containing [text](##Text) and other [inline](##Inline) nodes.

## Nodes

Each [node](##Node) has a [type](##Node.type). This is an
[object](##NodeType) containing information about the type of node
that this is, including its [name](##NodeType.name), various flags
that indicate its role ([`isBlock`](##NodeType.isBlock),
[`isTextblock`](##NodeType.isTextblock),
[`isInline`](##NodeType.isInline), [`isText`](##NodeType.isText)), and
the [kind](##NodeType.kinds) of node that it can
[contain](##NodeType.contains).

Each type may have [attributes](##NodeType.attrs) associated with it,
which are string values, [stored](##Node.attrs) in every node of that
type, which provide more information about the node. For example, for
an [image](##Image) node stores its image URL in an attribute named
`src`.

In addition, nodes come with an array of [marks](##Mark), which
provides information like [emphasis](##EmMark) or being a
[link](##LinkMark).

Even nodes that don't allow content have a `content` property
containing a [fragment](##Fragment). It will simply be empty for empty
nodes. More on fragments in the next section.

That is all the content stored in a node object, except that text
nodes also have a [`text`](##Node.text) property containing their text
value.

## Traversing

There are various ways in which you can run over the content of a
node. For single-level traversal, the easies way is to use the
[`forEach`](##Node.forEach) method, which, much like `Array.forEach`,
will call your function for each child node.

For iteration that isn't simply start-to-end, you can use indexing.
The [`child`](##Node.child) method gives you the child at a given
offset, and the [`childCount`](##Node.childCount) property tells you
how many a node has.

To run over all nodes between a pair of positions, the
[`nodesBetween`](##Node.nodesBetween) method can be convenient. It
will call a callback for each descendant node in the given range.

## Indexing

Positions in a document are represented as integers, indicating the
amount of “tokens” that come before the given position. These tokens
don't actually exist as objects, they are just a counting convention.

 * The start of the document, right before the first content, is
   position 0.

 * When entering or leaving a node that can have content, that counts
   as one token. So if the document starts with a paragraph, the start
   of that paragraph couns as position 1.

 * Each character counts as one token. So if the paragraph at the
   start of the document contains the word “hi”, position 2 is after
   the “h”, position 3 after the “i”, and position 4 after the whole
   paragraph.

 * Nodes that do not allow content (such as images) count as a single
   token.

Interpreting such position involves quite a lot of counting. You can
call [`Node.resolve`](##Node.resolve) to get a more descriptive
[data structure](##ResolvedPos) for a position. This data structure
will tell you what the parent node of the position it, what its offset
into that parent is, what ancestors the parent has, and a few other
things.

Take good care to distinguish between child indices (as per
[`childCount`](##Node.childCount)), document-wide positions, and
node-local offsets (sometimes used in recursive functions to represent
a position into the node that's currently being handled).

## Changing

ProseMirror represents its documents as
[persistent](https://en.wikipedia.org/wiki/Persistent_data_structure)
data structures. That means, you should **never mutate them**. If you
have a handle to a document (or node, or fragment) that object will
stay the same.

This has a bunch of advantages. It makes it impossible to have an
editor in an invalid intermediate state, for example, since a new
document can be swapped in instantaneously. It also makes it easier to
reason about documents in a mathematics-like way, which is really hard
if your values keep changing underneath you. For example, it allows
ProseMirror to run a very efficient DOM [update](##ProseMirror.flush)
algorithm by comparing the last document it drew to the screen to the
current document.

To create an updated version of a whole document, you'll usually want
to use [`Node.replace`](##Node.replace), which replaces a given range
of the document with a [“slice”](##Slice) of new content.

To update a node shallowly, you'll usually want to use its
[`copy`](##Node.copy) method, which creates a similar node with new
content, along with update methods on fragments, such as
[`replaceChild`](##Fragment.replaceChild) or
[`append`](##Fragment.append).

Or, if you need to leave a record of your changes (which is necessary
when the document is in an editor), you'll go through the
[transform](./transform.html) interface instead, which provides
convenience methods for common types of transformations, and will
immediately create a new document for every step.

So this is going to break things:

    editor.doc.nodeAt(pos).text += "!" // BAD!

Whereas this works:

    editor.tr.insertText(pos, "!").apply()
