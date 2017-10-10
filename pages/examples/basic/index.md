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

@HTML

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
