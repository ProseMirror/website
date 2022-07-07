!{"template": "example", "title": "ProseMirror embedded editor example"}

<link rel=stylesheet href="../../css/codemirror.css">

# Embedded code editor

It can be useful to have the in-document representation of some node,
such as a code block, math formula, or image, show up as a custom
editor control specifically for such content. [Node
views](##view.NodeView) are a ProseMirror feature that make this
possible.

In this example, we set up code blocks, as they exist in the [basic
schema](##schema-basic), to be rendered as instances of
[CodeMirror](http://codemirror.net), a code editor component. The
general idea is quite similar to the [footnote example](../footnote/),
but instead of popping up the node-specific editor when the user
selects the node, it is always visible.

Wiring such a node view and keymap into an editor gives us something
like this:

@HTML

Because we want changes in the code editor to be reflected in the
ProseMirror document, our node view must flush changes to its content
to ProseMirror as soon as they happen. To allow ProseMirror commands
to act on the right selection, the code editor will also sync its
current selection to ProseMirror.

The first thing we do in our code block node view is create an editor
with some basic extensions, a few extra key bindings, and an update
listener that will do the synchronization.

PART(nodeview_start)

When the code editor is focused, translate any update that changes the
document or selection to a ProseMirror transaction. The `getPos` that
was passed to the node view can be used to find out where our code
content starts, relative to the outer document (the `+ 1` skips the
code block opening token).

PART(nodeview_forwardUpdate)

When adding steps to a transaction for content changes, the offset is
adjusted for the changes in length caused by the change, so that
further steps are created in the correct position.

The `setSelection` method on a node view will be called when
ProseMirror tries to put the selection inside the node. Our
implementation makes sure the CodeMirror selection is set to match the
position that is passed in.

PART(nodeview_setSelection)

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

When a node update comes in from ProseMirror, for example because of
an undo action, we sort of have to do the inverse of what
`forwardUpdate` did—check for text changes, and if present, propagate
them from the outer to the inner editor.

To avoid needlessly clobbering the state of the inner editor, this
method only generates a replacement for the range of the content that
was changed, by comparing the start and end of the old and new
content.

PART(nodeview_update)

The `updating` property is used to disable the event listener on the
code editor, so that it doesn't try to forward the change (which just
came from ProseMirror) back to ProseMirror.

PART(nodeview_end)

Handling cursor motion from the outer to the inner editor must be done
with a keymap on the outer editor, because the browser's native
behavior won't handle this. The `arrowHandler` function uses the
[`endOfTextblock` method](##view.EditorView.endOfTextblock) to
determine, in a bidi-text-aware way, whether the cursor is at the end
of a given textblock. If it is, and the next block is a code block,
the selection is moved into it.

PART(arrowHandlers)
