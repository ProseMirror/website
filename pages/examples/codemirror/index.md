!{"template": "example", "title": "ProseMirror embedded editor example"}

# Embedded code editor

It can be useful to have the in-document representation of some node,
such as a code block, math formula, or image, show up as a custom
editor control specifically for such content. [Node
views](##view.NodeView) are a ProseMirror feature that make this
possible.

Wiring this node view and keymap into an editor gives us something
like this:

<div id="editor"></div>

In this example, we set up code blocks, as they exist in the [basic
schema](##schema-basic), to be rendered as instances of
[CodeMirror](http://codemirror.net), a code editor component. The
general idea is quite similar to the [footnote example](../footnote/),
but instead of popping up the node-specific editor when the user
selects the node, it is always visible.

The adaptor code in the node view gets a bit more involved, because we
are translating between two diffent document concepts—ProseMirror's
tree versus CodeMirror's plain text.

PART(nodeview_start)

When the code editor is focused, we can keep the selection of the
outer editor synchronized with the inner one, so that any commands
executed on the outer editor see an accurate selection.

PART(nodeview_forwardSelection)

This helper function translates from a CodeMirror selection to a
ProseMirror selection. Because CodeMirror uses a line/column based
indexing system, `indexFromPos` is used to convert to an actual
character index.

PART(nodeview_asProseMirrorSelection)

Selections are also synchronized the other way, from ProseMirror to
CodeMirror, using the view's
[`setSelection`](##view.NodeView.setSelection) method.

PART(nodeview_setSelection)

When the actual content of the code editor is changed, the event
handler registered in the node view's constructor calls this method.
It'll compare the code block node's current value to the value in the
editor, and dispatch a transaction if there is a difference.

PART(nodeview_valueChanged)

A somewhat tricky aspect of nesting editor like this is handling
cursor motion across the edges of the inner editor. This node view
will have to take care of allowing the user to move the selection out
of the code editor. For that purpose, it binds the arrow keys to
handlers that check if further motion would ‘escape’ the editor, and
if so, return the selection and focus to the outer editor.

The keymap also binds keys for undo and redo, which the outer editor
will handle, and for ctrl-enter, which, in ProseMirror's base keymap,
creates a new paragraph after a code block.

PART(nodeview_keymap)

When an update comes in from the editor, for example because of an
undo action, we kind of have to do the inverse of what `valueChanged`
did—check for text changes, and if present, propagate them from the
outer to the inner editor.

PART(nodeview_update)

The `updating` property is used to disable the event handlers on the
code editor.

PART(nodeview_end)

`computeChange` which was used to compare two strings and find the
minimal change between them, looks like this:

PART(computeChange)

It iterates from the start and end of the strings, until it hits a
difference, and returns an object giving the change's start, end, and
replacement text, or `null` if there was no change.

Handling cursor motion from the outer to the inner editor must be done
with a keymap on the outer editor. The `arrowHandler` function uses
the [`endOfTextblock` method](##view.EditorView.endOfTextblock) to
determine, in a bidi-text-aware way, whether the cursor is at the end
of a given textblock. If it is, and the next block is a code block,
the selection is moved into it.

PART(arrowHandlers)

<div id=content style="display: none">
<h3>The code block is a code editor</h3>
<p>This editor has been wired up to render code blocks as instances of
the <a href="http://codemirror.net">CodeMirror</a> code editor, which
provides syntax highlighting, auto-indentation, and similar.</p>
<pre>
function max(a, b) {
  return a > b ? a : b
}</pre>
<p>The content of the code editor is kept in sync with the content of
the code block in the rich text editor, so that it is as if you're
directly editing the outer document, using a more convenient
interface.</p>
</div>

<link rel=stylesheet href="../../css/codemirror.css">
<style>
  .CodeMirror {
    border: 1px solid #eee;
    height: auto;
  }
  .CodeMirror pre { white-space: pre !important }
</style>
