!{"template": "example", "title": "ProseMirror basic example"}

# Setting up an editor

Setting up a full editor ‘from scratch’, using only the core
libraries, requires quite a lot of code. To be able to get started
quickly with a pre-configured editor, we provide the
[`prosemirror-example-setup`](https://github.com/prosemirror/prosemirror-example-setup)
package, which creates an array of plugins for you, configured to
create a passable editing interface for a given schema. In this
example, we use the [basic
schema](https://github.com/prosemirror/prosemirror-schema-basic) and
extend it with
[lists](https://github.com/prosemirror/prosemirror-schema-list).

PART(code)

And this is what it looks like:

<div id=editor style="margin-bottom: 23px"></div>

These plugins are created by the example setup:

 * [Input rules](##inputrules), which are input macros that fire when
   certain patterns are typed. In this case, it is set up to provide
   things like smart quotes and some Markdown-like behavior, such as
   starting a blockquote when you type “> ”.
 * [Keymaps](##keymap) with the [base bindings](##commands.baseKeymap)
   and custom bindings for common mark and node types, such as mod-i
   to enable emphasis and ctrl-shift-1 to make the current textblock a
   heading.
 * The [drop
   cursor](https://github.com/prosemirror/prosemirror-dropcursor) and
   [gap cursor](##gapcursor) plugins.
 * The [undo history](##history).
 * A [menu bar](https://github.com/prosemirror/prosemirror-menu)
   (which is another module that is meant more for demos than for
   production), with menu items for common tasks and schema elements.

<div style="display: none" id="content">
  <h3>Hello ProseMirror</h3>

  <p>This is editable text. You can focus it and start typing.</p>

  <p>To apply styling, you can select a piece of text and manipulate
  its styling from the menu. The basic schema
  supports <em>emphasis</em>, <strong>strong
  text</strong>, <a href="http://marijnhaverbeke.nl/blog">links</a>, <code>code
  font</code>, and <img src="/img/smiley.png"> images.</p>

  <p>Block-level structure can be manipulated with key bindings (try
  ctrl-shift-2 to create a level 2 heading, or enter in an empty
  textblock to exit the parent block), or through the menu.</p>

  <p>Try using the “list” item in the menu to wrap this paragraph in
  a numbered list.</p>
</div>
