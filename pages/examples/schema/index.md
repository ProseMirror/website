!{"template": "example", "title": "ProseMirror schema example"}

<style>
  #text-editor { background-color: rgba(0, 0, 0, 0.05); padding: 0 }
  .ProseMirror { min-height: none !important }
  note, notegroup { display: block; border: 1px solid silver; border-radius: 3px; padding: 3px 6px; margin: 5px 0; }
  notegroup { border-color: #66f }
</style>

# A schema from scratch

ProseMirror [schemas](/docs/guide/#schema) provide something like a
syntax for documents—they set down which structures are valid.

The most simple schema possible allows the document to be composed
just of text.

PART(textSchema)

You can use it to edit inline content. <span id="text-editor"></span>
(A ProseMirror instance can be
[mounted](##view.EditorView.constructor) on any node, including inline
nodes.)

## Blocks

To add more structure, you'll usually want to add some kind of block
nodes. For example, this schema consists of notes that can
optionally be grouped with group nodes.

PART(noteSchema)

<div id=note-editor></div>

You can press ctrl-space (cmd-space on OS X) to add a group around the
selected notes. To get that functionality, you first have to implement
a custom [editing command](/docs/guide/#commands). Something like
this:

PART(makeNoteGroup)

A [keymap](##keymap) like `keymap({"Mod-Space": makeNoteGroup})` can
be used to enable it.

The [generic bindings](##commands.baseKeymap) for enter and backspace
work just fine in this schema—enter will split the textblock around
the cursor, or if that's empty, try to lift it out of its parent node,
and thus can be used to create new notes and escape from a note group.
Backspace at the start of a textblock will lift that textblock out of
its parent, which can be used to remove notes from a group.

<div style="display: none">
  <div id="text-content">Such as this sentence.</div>
  <div id="note-content">
    <note>Do laundry</note>
    <note>Water the tomatoes</note>
    <notegroup>
      <note>Buy flour</note>
      <note>Get toilet paper</note>
    </notegroup>
  </div>
</div>
