!{"template": "example", "title": "ProseMirror dino example"}

# Dinos in the document

Say you need to include exotic, site-specific elements in your
documents. These may be handles to other objects in our system
(documents, users, etc), domain-specific widgets, or, in the case of
this demo, dinosaurs.

ProseMirror allows you to define your own schemas, which includes
defining custom document elements. You can use whatever you put in the
schema as proper semantic element in your documents.

@HTML

In this example, we extend the
[basic](https://github.com/prosemirror/prosemirror-schema-basic)
schema with a single new node. First, we define a [node
spec](##model.NodeSpec), which describes the node's behavior and its
DOM representation.

PART(nodespec)

Then, we create an actual schema that includes this node, and use that
to parse a piece of the HTML page into a ProseMirror document.

PART(schema)

The demo is going to use the [example
setup](https://github.com/prosemirror/prosemirror-example-setup)
module again, to provide the basic plumbing for the editor. But we
need new menu items in the insert menu. First, define a
[command](/doc/guide/#commands) that handles dinosaur insertion.

PART(command)

Next, create menu items that call our command.

PART(menu)

Now all that's left to do is creating an editor state and view with
our custom schema and menu.

PART(editor)
