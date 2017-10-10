!{"template": "example", "title": "ProseMirror collab example"}

# Collaborate

The editor below talks to a simple server-side service to allow
real-time [collaborative
editing](http://marijnhaverbeke.nl/blog/collaborative-editing.html).
Everybody connected to a given document sees the same document, and
has their changes sent over to other people working on the
document.

The demo also (crudely) shows how ProseMirror can be used to implement
something like out-of-line annotations. If you select text and click
the speech bubble icon in the menu, you'll be prompted to enter an
annotation. These are synced to other users and show up as text with
yellow background. Put the cursor in an annotation to see what it
says.

You can find the code for this
[here](https://github.com/ProseMirror/website/tree/master/src/collab/).

**Disclaimer:** Since this demo is open for everybody, you might run
into people typing stupid, mean, and disgusting things. Since I'm not
going to be able to moderate this, I recommend just hitting delete.

@HTML
