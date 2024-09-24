!{"template": "example", "title": "ProseMirror folding example"}

# Folding Nodes

This example shows how to use node decorations to influence the
behavior of node views. Specifically, we'll define a plugin that
allows the user to *fold* some nodes (hiding their content).

@HTML

We start by modifying the basic schema so that the top level consists
of a sequence of sections, each of which must contain a heading
followed by some arbitrary blocks.

PART(schema)

To display these sections, we'll use a node view that shows a little
uneditable header with a button in it. It looks through the direct
decorations that it receives, and when one of those has the
`foldSection` property in its spec, it considers itself folded, which
is reflected in the type of arrow shown on the button and whether the
content is hidden or visible.

PART(nodeview)

The mouse handler for the button just calls `setFolding`, which we
will define in a moment.

It would mostly work to avoid using decorations for a feature like
this, and just keep folding status in an instance property in the node
view. There are two downsides to this approach, though: Firstly, node
views may get recreated for a number of reasons (when their DOM gets
unexpectedly mutated, or when the view update algorithm associates
them with the wrong section node), which causes their internal state
to be lost. Secondly, maintaining this kind of state explicitly on the
editor level makes it possible to influence it from outside the
editor, inspect it, or serialize it.

Thus, here the state is tracked with a plugin. The role of this plugin
is to track the set of folding decorations and to install the above
node view.

PART(plugin)

The substance of this code is the state update method. It starts by
mapping the fold decorations forward through the transaction, so that
they continue to be aligned to the section's updated positions.

And then it checks whether the transaction contains metadata that
instructs it to add or remove a folded node. We use the plugin itself
as metadata label. If this is present, it will hold a `{pos: number,
fold: boolean}` object. Depending on the value of `fold`, the code
adds or removes a node decoration at the given position.

The `setFolding` function dispatches these kinds of transactions. In
addition, it makes sure to push the selection out of the folded node,
if possible.

PART(setFolding)

Loading this plugin alongside a schema that has sections will give you
an editor with foldable sections.

(To make them usable, you'd also need some kind of commands to create
and join sections, but that is left out of the scope of this example.)
