<style>
  .box {
    color: white;
    display: inline-block;
    border-radius: 5px;
    padding: 3px 6px;
    margin: 3px 0;
    vertical-align: top;
  }
</style>

ProseMirror defines its own [data structure](##model.Node) to
represent content documents. Since documents are the central element
around which the rest of the editor is built, it is helpful to
understand how they work.

## Structure

A ProseMirror document is a [node](##model.Node), which holds a
[fragment](##model.Fragment) containing zero or more child nodes.

This is a lot like the [browser
DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model),
in that it is recursive and tree-shaped. But it differs from the DOM
in the way it stores inline content.

In HTML, a paragraph with markup is represented as a tree, like this:

```html
<p>This is <strong>strong text with <em>emphasis</em></strong></p>
```

<div class=figure>
  <div class=box style="background: #77e">
    <strong>p</strong><br>
    "This is "
    <div class=box style="background: #55b">
      <strong>strong</strong><br>
      "strong text with "
      <div class=box style="background: #77e">
        <strong>em</strong><br>
        "emphasis"
      </div>
    </div>
  </div>
</div>

Whereas in ProseMirror, the inline content is modeled as a flat
sequence, with the markup attached as metadata to the nodes:

<div class=figure>
  <div class=box style="background: #77e">
    <strong>paragraph</strong><br>
    <div class=box style="background: #55b">
      "This is "
    </div>
    <div class=box style="background: #55b">
      "strong text with "<br>
      <div class=box style="background: #d94">
        <strong>strong</strong>
      </div>
    </div>
    <div class=box style="background: #55b">
      "emphasis"<br>
      <div class=box style="background: #d94">
        <strong>strong</strong>
      </div>
      <div class=box style="background: #d94">
        <strong>em</strong>
      </div>
    </div>
  </div>
</div>

This more closely matches the way we tend to think about
and work with such text. It allows us to represent positions in a
paragraph using a character offset rather than a path in a tree, and
makes it easier to perform operations like splitting or changing the
style of the content without performing awkward tree manipulation.

This also means each document has _one_ valid representation. Adjacent
text nodes with the same set of marks are always combined together,
and empty text nodes are not allowed. The order in which marks appear
is specified by the schema.

So a ProseMirror document is a tree of block nodes, with most of the
leaf nodes being _textblocks_, which are block nodes that contain
text. You can also have leaf blocks that are simply empty, for example
a horizontal rule or a video element.

Node objects come with a number of properties that reflect the role
they play in the document:

  * `isBlock` and `isInline` tell you whether a given node is a block
    or inline node.
  * `inlineContent` is true for nodes that expect inline nodes as
    content.
  * `isTextblock` is true for block nodes with inline content.
  * `isLeaf` tells you that a node doesn't allow any content.

So a typical `"paragraph"` node will be a textblock, whereas a
blockquote might be a block element whose content consists of other
blocks. Text, hard breaks, and inline images are inline leaf nodes,
and a horizontal rule node would be an example of a block leaf node.

The [schema](#schema) is allowed to specify more precise
constraints on what may appear where—i.e. even though a node allows
block content, that doesn't mean that it allows _all_ block nodes as
content.

## Identity and persistence

Another important difference between a DOM tree and a ProseMirror
document is the way the objects that represent nodes behave. In the
DOM, nodes are mutable objects with an _identity_, which means that a
node can only appear in one parent node, and that the node object
is mutated when it is updated.

In ProseMirror, on the other hand, nodes are simply _values_, and
should be approached much as you'd approach the value representing the
number 3. 3 can appear in multiple data structures at the same time,
it does not have a parent-link to the data structure it is currently
part of, and if you add 1 to it, you get a _new_ value, 4, without
changing anything about the original 3.

So it is with pieces of ProseMirror documents. They don't change, but
can be used as a starting value to compute a modified piece of
document. They don't know what data structures they are part of, but
can be part of multiple structures, or even occur multiple times in a
single structure. They are _values_, not stateful objects.

This means that every time you update a document, you get a new
document value. That document value will share all sub-nodes that
didn't change with the original document value, making it relatively
cheap to create.

This has a bunch of advantages. It makes it impossible to have an
editor in an invalid in-between state during an update, since the new
state, with a new document, can be swapped in instantaneously. It also
makes it easier to reason about documents in a somewhat mathematical
way, which is really hard if your values keep changing underneath you.
This helps make collaborative editing possible and allows ProseMirror
to run a very efficient DOM [update](##view.EditorView.update)
algorithm by comparing the last document it drew to the screen to the
current document.

Because such nodes are represented by regular JavaScript objects, and
explicitly
[freezing](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)
their properties hampers performance, it is actually _possible_ to
change them. But doing this is not supported, and will cause things to
break, because they are almost always shared between multiple data
structures. So be careful! And note that this also holds for the
arrays and plain objects that are _part_ of node objects, such as the
objects used to store node attributes, or the arrays of child nodes in
fragments.

## Data structures

The object structure for a document looks something like this:

<style>
  .classbox { border-radius: 8px; padding: 4px 10px; color: white; display: inline-block; vertical-align: middle; }
  .classbox td { vertical-align: top; padding: 0; border-right: 5px solid transparent; }
</style>
<div class=classbox style="background: #77e; margin-left: 20px">
  <table style="cell-spacing: collapse">
    <tr><td><strong>Node</strong></td></tr>
    <tr>
      <td>type:</td>
      <td><div class=classbox style="background: #446"><strong>NodeType</strong></div></td>
    </tr>
    <tr>
      <td>content:</td>
      <td><div class=classbox style="background: #44e"><strong>Fragment</strong><br>
        [<div class=classbox style="background: #77e"><strong>Node</strong></div>,
         <div class=classbox style="background: #77e"><strong>Node</strong></div>, ...]</td>
    </tr>
    <tr>
      <td>attrs:</td>
      <td><div class=classbox style="background: #99e"><strong>Object</strong></div></td>
    </tr>
    <tr>
      <td>marks:</td>
      <td>[<div class=classbox style="background: #55b">
        <table style="cell-spacing: collapse">
          <tr><td><strong>Mark</strong></td></tr>
          <tr>
            <td>type:</td>
            <td><div class=classbox style="background: #446"><strong>MarkType</strong></div></td>
          </tr>
          <tr>
           <td>attrs:</td>
           <td><div class=classbox style="background: #99e"><strong>Object</strong></div></td>
         </tr>
       </table></div>, ...]</td>
    </tr>
  </table>
</div>

Each node is represented by an instance of the [`Node`](##model.Node)
class. It is tagged with a [type](##model.NodeType), which knows the
node's name, the attributes that are valid for it, and so on. Node
types (and mark types) are created once per schema, and know which
schema they are part of.

The content of a node is stored in an instance of
[`Fragment`](##model.Fragment), which holds a sequence of nodes. Even
for nodes that don't have or don't allow content, this field is filled
(with the shared [empty fragment](##model.Fragment^empty)).

Some node types allow attributes, which are extra values stored with
each node. For example, an image node might use these to store its alt
text and the URL of the image.

In addition, inline nodes hold a set of active marks—things like
emphasis or being a link—which are represented as an array of
[`Mark`](##model.Mark) instances.

A full document is just a node. The document content is represented as
the top-level node's child nodes. Typically, it'll contain a series of
block nodes, some of which may be textblocks that contain inline
content. But the top-level node may also be a textblock itself, so
that the document contains only inline content.

What kind of node is allowed where is determined by the document's
[schema](#schema). To programatically create nodes, you must go
through the schema, for example using the
[`node`](##model.Schema.node) and [`text`](##model.Schema.text)
methods.

```javascript
import {schema} from "prosemirror-schema-basic"

// (The null arguments are where you can specify attributes, if necessary.)
let doc = schema.node("doc", null, [
  schema.node("paragraph", null, [schema.text("One.")]),
  schema.node("horizontal_rule"),
  schema.node("paragraph", null, [schema.text("Two!")])
])
```

## Indexing

ProseMirror nodes support two types of indexing—they can be treated as
trees, using offsets into individual nodes, or they can be treated as
a flat sequence of tokens.

The first allows you to do things similar to what you'd do with the
DOM—interacting with single nodes, directly accessing child nodes
using the [`child` method](##model.Node.child) and
[`childCount`](##model.Node.childCount), writing recursive functions
that scan through a document (if you just want to look at all nodes,
use [`descendants`](##model.Node.descendants) or
[`nodesBetween`](##model.Node.nodesBetween)).

The second is more useful when addressing a specific position in the
document. It allows any document position to be represented as an
integer—the index in the token sequence. These tokens don't actually
exist as objects in memory—they are just a counting convention—but the
document's tree shape, along with the fact that each node knows its
size, is used to make by-position access cheap.

 * The start of the document, right before the first content, is
   position 0.

 * Entering or leaving a node that is not a leaf node (i.e. supports
   content) counts as one token. So if the document starts with a
   paragraph, the start of that paragraph counts as position 1.

 * Each character in text nodes counts as one token. So if the
   paragraph at the start of the document contains the word “hi”,
   position 2 is after the “h”, position 3 after the “i”, and position
   4 after the whole paragraph.

 * Leaf nodes that do not allow content (such as images) also count as
   a single token.

So if you have a document that, when expressed as HTML, would look
like this:

```html
<p>One</p>
<blockquote><p>Two<img src="..."></p></blockquote>
```

The token sequence, with positions, looks like this:

    0   1 2 3 4    5
     <p> O n e </p>

    5            6   7 8 9 10    11   12            13
     <blockquote> <p> T w o <img> </p> </blockquote>

Each node has a [`nodeSize`](##model.Node.nodeSize) property that
gives you the size of the entire node, and you can access
[`.content.size`](##model.Fragment.size) to get the size of the node's
_content_. Note that for the outer document node, the open and close
tokens are not considered part of the document (because you can't put
your cursor outside of the document), so the size of a document is
`doc.content.size`, **not** `doc.nodeSize`.

Interpreting such position manually involves quite a lot of counting.
You can call [`Node.resolve`](##model.Node.resolve) to get a more
descriptive [data structure](##model.ResolvedPos) for a position. This
data structure will tell you what the parent node of the position it,
what its offset into that parent is, what ancestors the parent has,
and a few other things.

Take care to distinguish between child indices (as per
[`childCount`](##model.Node.childCount)), document-wide positions, and
node-local offsets (sometimes used in recursive functions to represent
a position into the node that's currently being handled).

## Slices

To handle things like copy-paste and drag-drop, it is necessary to be
able to talk about a slice of document, i.e. the content between two
positions. Such a slice differs from a full node or fragment in that
some of the nodes at its start or end may be ‘open’.

For example, if you select from the middle of one paragraph to the
middle of the next one, the slice you've selected has two paragraphs
in it, the first one open at the start, the second open at the end,
whereas if you node-select a paragraph, you've selected a closed node.
It may be the case that the content in such open nodes violates the
schema constraints, if treated like the node's full content, because
some required nodes fell outside of the slice.

The [`Slice`](##model.Slice) data structure is used to represent such
slices. It stores a [fragment](##model.Fragment) along with an [open
depth](##model.Slice.openStart) on both sides. You can use the
[`slice` method](##model.Node.slice) on nodes to cut a slice out of a
document.

```javascript
// doc holds two paragraphs, containing text "a" and "b"
let slice1 = doc.slice(0, 3) // The first paragraph
console.log(slice1.openStart, slice1.openEnd) // → 0 0
let slice2 = doc.slice(1, 5) // From start of first paragraph
                             // to end of second
console.log(slice2.openStart, slice2.openEnd) // → 1 1
```

## Changing

Since nodes and fragments are
[persistent](https://en.wikipedia.org/wiki/Persistent_data_structure),
you should **never** mutate them. If you have a handle to a document
(or node, or fragment) that object will stay the same.

Most of the time, you'll use [transformations](#transform) to
update documents, and won't have to directly touch the nodes. These
also leave a record of the changes, which is necessary when the
document is part of an editor state.

In cases where you do want to 'manually' derive an updated document,
there are some helper methods available on the [`Node`](##model.Node)
and [`Fragment`](##model.Fragment) types. To create an updated version
of a whole document, you'll usually want to use
[`Node.replace`](##model.Node.replace), which replaces a given range
of the document with a [slice](##model.Slice) of new content. To
update a node shallowly, you can use its [`copy`](##model.Node.copy)
method, which creates a similar node with new content. Fragments also
have various updating methods, such as
[`replaceChild`](##model.Fragment.replaceChild) or
[`append`](##model.Fragment.append).
