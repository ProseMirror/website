!{"template": "example", "title": "ProseMirror dino example"}

# Dinos in the document

<style>
  img.dinosaur { height: 40px; vertical-align: bottom; border: 1px solid #0ae; border-radius: 4px; background: #ddf6ff }
</style>

Say you need to include exotic, site-specific elements in your
documents. These may be handles to other objects in our system
(documents, users, etc), domain-specific widgets, or, in the case of
this demo, dinosaurs.

ProseMirror allows you to define your own schemas, which includes
defining custom document elements. You can use whatever you put in the
schema as proper semantic element in your documents.

<div id="editor"></div>

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
need new menu items in the insert menu, to insert dinosaurs. This code
creates them:

PART(menu)

Now all that's left to do is creating an editor state and view with
our custom schema and menu.

PART(editor)

<div id="content" style="display: none">
  <p>This is your dinosaur-enabled editor. The insert menu allows you
  to insert dinosaurs.</p>
  <p>This paragraph <img class=dinosaur dino-type="stegosaurus">, for example,
  <img class=dinosaur dino-type="triceratops">
  is full <img class=dinosaur dino-type="tyrannosaurus"> of
  dinosaurs.</p>
  <p>Dinosaur nodes can be selected, copied, pasted, dragged, and so on.</p>
</div>
