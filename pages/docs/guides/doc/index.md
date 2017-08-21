!{"title": "ProseMirror Document Guide",
  "template": "guide"}

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

# Document Basics

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

    <p>This is <strong>strong text with <em>emphasis</em></strong></p>

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
    <strong>p</strong><br>
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
editor in an invalid in-between state, since a new state, with a new
document, can be swapped in instantaneously. It also makes it easier
to reason about documents in a mathematical-like way, which is really
hard if your values keep changing underneath you. For example, it
allows ProseMirror to run a very efficient DOM
[update](##view.EditorView.update) algorithm by comparing the last
document it drew to the screen to the current document.

Because such nodes are represented by regular JavaScript objects, and
explicitly
[freezing](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)
their properties hinders performance, it is actually _possible_ to
change them. But doing this is not supported, and will cause things to
break, because they are almost always shared between multiple data
structures. So be careful, and note that this also holds for the
arrays and plain objects that are _part_ of node objects, such as the
objects used to store node attributes.

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
      <td><div class=classbox style="background: #99e">{<strong>Object</strong>}</div></td>
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
           <td><div class=classbox style="background: #99e">{<strong>Object</strong>}</div></td>
         </tr>
       </table></div>, ...]</td>
    </tr>
  </table>
</div>

Each node is represented by an instance of the [`Node`](##model.Node)
class. It is tagged with a [type](##model.NodeType), which knows the
node's name, the schema it is part of, and so on.

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
[schema](../schema/).

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
exist as objects, they are just a counting convention.

 * The start of the document, right before the first content, is
   position 0.

 * Entering or leaving a node that is not a leaf node (i.e. supports
   content) counts as one token. So if the document starts with a
   paragraph, the start of that paragraph counts as position 1.

 * Each character counts as one token. So if the paragraph at the
   start of the document contains the word “hi”, position 2 is after
   the “h”, position 3 after the “i”, and position 4 after the whole
   paragraph.

 * Leaf nodes that do not allow content (such as images) also count as
   one token.

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

Since nodes and fragments are
[persistent](https://en.wikipedia.org/wiki/Persistent_data_structure),
you should **never** mutate them. If you have a handle to a document
(or node, or fragment) that object will stay the same.

Most of the time, you'll use [transformations](../transform/) to
update documents, and won't have to directly touch the nodes. These
also leave a record of the changes, which is necessary when the
document is in an editor state.

In cases where you do want to 'manually' derive an updated document,
there are some helper methods available on the [`Node`](##model.Node)
and [`Fragment`](##model.Fragment) types.

To create an updated version of a whole document, you'll usually want
to use [`Node.replace`](##model.Node.replace), which replaces a given
range of the document with a [“slice”](##model.Slice) of new content.

To update a node shallowly, you can use its
[`copy`](##model.Node.copy) method, which creates a similar node with
new content. Fragments also have various updating methods, such as
[`replaceChild`](##model.Fragment.replaceChild) or
[`append`](##model.Fragment.append).
