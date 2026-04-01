!{"template": "example", "title": "ProseMirror basic example"}

# Setting up an editor

Setting up a full editor ‘from scratch’, using only the core
libraries, requires quite a lot of code. To be able to get started
quickly with a pre-configured editor, we provide the
[`prosemirror-example-setup`](https://code.haverbeke.berlin/prosemirror/prosemirror-example-setup)
package, which creates an array of plugins for you, configured to
create a passable editing interface for a given schema. In this
example, we use the [basic
schema](https://code.haverbeke.berlin/prosemirror/prosemirror-schema-basic) and
extend it with
[lists](https://code.haverbeke.berlin/prosemirror/prosemirror-schema-list).

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
   cursor](https://code.haverbeke.berlin/prosemirror/prosemirror-dropcursor) and
   [gap cursor](##gapcursor) plugins.
 * The [undo history](##history).
 * A [menu bar](https://code.haverbeke.berlin/prosemirror/prosemirror-menu)
   (which is another module that is meant more for demos than for
   production), with menu items for common tasks and schema elements.

Many ProseMirror packages come with a CSS file (linked under the
`"style"` field in package.json). You must make sure to load these
into the document that contains your editor. Some bundlers will help
you with this, but if they don't, either create link tags like below,
or make sure these files get concatenated into your bundled CSS.

```html
<link rel=stylesheet href="path/prosemirror-view/style/prosemirror.css">
<link rel=stylesheet href="path/prosemirror-menu/style/menu.css">
<link rel=stylesheet href="path/prosemirror-example-setup/style/style.css">
<link rel=stylesheet href="path/prosemirror-gapcursor/style/gapcursor.css">
```
