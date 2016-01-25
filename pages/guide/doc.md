!{"title": "ProseMirror Document Guide",
  "template": "guide"}

# Guide to the Document Data Structure

ProseMirror defines a set of data structures (in the
[model module](##model)) to represent documents. This guide explains
the basics of those data structures.

## Structure

A ProseMirror document is tree-shaped, much like the
[browser DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model).
ProseMirror documents are made up of [nodes](##Node), each
of which contains a [fragment](##Fragment) containing zero
or more child nodes.

Each node is context-free, and does not know anything about its parent
nodes. In fact, a node may be shared between multiple documents or
even appear multiple times in a single document.

An important difference between the DOM and ProseMirror's data model
is that inline content is *flat* in a ProseMirror document. The tree
shape is not used to represent things like strong or emphasized text.
Instead, text (and other inline content) can have
[marks](##Mark) associated with it to indicate such
styling. In HTML, you'd have this:

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

For more complicated iteration, you can use [iterators](##Node.iter),
which are
[ES6-style](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)
iterators that run over direct child nodes, either within a given
range, or through the whole node. Even if you don't use ES6-style
`for/of` syntax, you can use them quite easily like this:

    for (var iter = parent.iter(), child; child = iter.next().value;)
      ; // Do something with child

This works because `iter.next().value` will be `null` when the
iterator reaches its end. There are also
[reverse iterators](##Node.reverseIter) for when you want to iterate
in the other direction.

You should usually not use [indexed access](##Node.child) to nodes.
Indices into nodes are character-based, which means they treat text
nodes specially—in a node that contains the word `"foo"` and an image,
indices 0 to 2 all point at the text node, and 3 points at the image.
Thus, looping from 0 to [`parent.size`](##Node.size) and calling
[`child`](##Node.child) for each index will rarely do what you want.

The exception to this is when descending the document along a
[path](##Pos.path). In that case, the path elements refer to parent
nodes, which can not be text nodes, and thus you can safely call
[`child`](##node.child).

For deep traversal, the [`nodesBetween`](##Node.nodesBetween) method
can be convenient. It will call a callback for each descendant node,
optionally constrainted to a certain range.

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

To create updated, new versions of a node, you can use methods like
[`slice`](##Node.slice), [`splice`](##Node.splice),
[`append`](##Node.append), and [`replace`](##Node.replace).

Or, if you need to leave a record of your changes (which is necessary
when the document is in an editor), you'll go through the
[transform](./transform.html) interface instead, which provides
convenience methods for common types of transformations, and will
immediately create a new document for every step.

So this is going to break things:

    editor.doc.nodeAfter(pos).text += "!" // BAD!

Whereas this works:

    editor.tr.insertText(pos, "!").apply()

## Positions

Positions in a document are represented using the [`Pos`](##Pos) type,
which wraps a path into the document—an array of offsets into
subsequent nodes, bringing us to the position's parent node—and an
offset into that parent node.

The editor selection is represented as a pair of such positions, but
they also come up in almost all computation that you might want to do
on a document.
