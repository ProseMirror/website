!{"template": "example", "title": "ProseMirror footnote example"}

<style>
  .ProseMirror {
    counter-reset: prosemirror-footnote;
  }
  footnote {
    display: inline-block;
    position: relative;
    cursor: pointer;
  }
  footnote::after {
    content: counter(prosemirror-footnote);
    vertical-align: super;
    font-size: 75%;
    counter-increment: prosemirror-footnote;
  }
  .ProseMirror-hideselection .footnote-tooltip *::selection { background-color: transparent; }
  .ProseMirror-hideselection .footnote-tooltip *::-moz-selection { background-color: transparent; }
  .footnote-tooltip {
    cursor: auto;
    position: absolute;
    left: -30px;
    top: calc(100% + 10px);
    background: silver;
    padding: 3px;
    border-radius: 2px;
    width: 500px;
  }
  .footnote-tooltip::before {
    border: 5px solid silver;
    border-top-width: 0px;
    border-left-color: transparent;
    border-right-color: transparent;
    position: absolute;
    top: -5px;
    left: 27px;
    content: " ";
    height: 0;
    width: 0;
  }
</style>

# Editing footnotes

This example demonstrates one way to implement something like
footnotes in ProseMirror. Footnotes seem like they should be inline
nodes with content—they appear in between other inline content, but
their content isn't really part of the textblock around them. Let's
define them like this:

PART(schema)

Inline nodes with content are not handled well by the library, at
least not by default. You are required to write a [node
view](/docs/guide/#view.node_views) for them, which somehow manages
the way they appear in the editor.

So that's what we'll do. Footnotes in this example are drawn as
numbers. In fact, they are just `<footnote>` nodes, and we'll rely on
CSS to add the numbers.

PART(nodeview_start)

Only when the node view is selected does the user get to see and
interact with its content (it'll be selected when the user ‘arrows’
onto it, because we set the [`atom`](##model.NodeSpec.atom) property
on the node spec). These two methods handle node selection and
deselection the node view.

PART(nodeview_select)

What we'll do is pop up a little sub-editor, which is itself a
ProseMirror view, with the node's content. Transactions in this
sub-editor are handled specially, in the `dispatchInner` method.

Mod-z and y are bound to run undo and redo on the _outer_ editor.
We'll see in a moment why that works.

PART(nodeview_open)

What should happen when the content of the sub-editor changes? We
could just take its content and reset the content of the footnote in
the outer document to it, but that wouldn't play well with the undo
history or collaborative editing.

A nicer approach is to simply apply the steps from the inner editor,
with an appropriate offset, to the outer document.

We have to be careful to handle [appended
transactions](##state.PluginSpec.appendTransaction), and to be able to
handle updates from the outside editor without creating an infinite
loop, the code also understands the transaction flag `"fromOutside"`
and disables propagation when it's present.

PART(nodeview_dispatchInner)

To be able to cleanly handle updates from outside (for example through
collaborative editing, or when the user undoes something, which is
handled by the outer editor), the node view's
[`update`](##view.NodeView.update) method carefully finds the
difference between its current content and the content of the new
node. It only replaces the changed part, in order to leave the cursor
in place whenever possible.

PART(nodeview_update)

Finally, the nodeview has to handle destruction and queries about
which events and mutations should be handled by the outer editor.

PART(nodeview_end)

We can enable our schema and node view like this, to create an actual
editor.

PART(editor)

<div id="editor"></div>

<div id="content" style="display: none">
  <p>This paragraph has a footnote<footnote>Which is a piece of text placed at the bottom of a page or chapter, providing additional <em>comments</em> or <em>citations</em>.</footnote> in it. And another<footnote>Some more footnote text.</footnote> one.</p>
  <p>Move onto or click on a footnote number to edit it.</p>
</div>
