!{"template": "example", "title": "ProseMirror lint example"}

# Linting example

The browser DOM serves its purpose—representing complex webpages—very
well. But its huge scope and loose structure makes it difficult to
make assumptions about. A document model that represents a smaller set
of documents can be easier to reason about.

This example implements a simple document
[linter](https://en.wikipedia.org/wiki/Lint_(software)) that finds
problems in your document, and makes it easy to fix them.

@HTML

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/prosemirror-demo-lint)

The first part of this example is a function that, given a document,
produces an array of problems found in that document. We'll use the
[`descendants`](##model.Node.descendants) method to easily iterate
over all nodes in a document. Depending on the type of node, different
types of problems are checked for.

Each problem is represented as an object with a message, a start, and
an end, so that they can be displayed and highlighted. The objects may
also optionally have a `fix` method, which can be called (passing the
view) to fix the problem.

PART(lint)

The helper utilities that are used to provide fix commands look like
this.

PART(fix)

The way the plugin will work is that it'll keep a set of decorations
that highlight problems and inserts an icon next to them. CSS is used
to position the icon on the right side of the editor, so that it
doesn't interfere with the document flow.

PART(deco)

The problem object is stored in the icon DOM nodes, so that event
handlers can access them when handling clicks on the node. We'll make
a single click on an icon select the annotated region, and a double
click run the `fix` method.

Recomputing the whole set of problems, and recreating the set of
decorations, on every change isn't very efficient, so for production
code you might want to consider an approach that can incrementally
update these. That'd be quite a bit more complex, but definitely
doable—the transaction can give you the information you need to figure
out what part of the document changed.

PART(plugin)
