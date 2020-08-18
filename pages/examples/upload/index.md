!{"template": "example", "title": "ProseMirror upload example"}

# Upload handling

Some types of editing involve asynchronous operations, but you want to
present them to your users as a single action. For example, when
inserting an image from the user's local filesystem, you won't have
access to the actual image until you've uploaded it and created a URL
for it. Yet, you don't want to make the user go through the motion of
first uploading the image, then waiting for that to complete, and only
then inserting the image into the document.

Ideally, when the image is selected, you start the upload but also
immediately insert a placeholder into the document. Then, when the
upload finishes, that placeholder is replaced with the final image.

@HTML

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/prosemirror-demo-upload)

Since the upload might take a moment, and the user might make more
changes while waiting for it, the placeholder should move along with
its context as the document is edited, and when the the final image is
inserted, it should be put where the placeholder has ended up by that
time.

The easiest way to do this is to make the placeholder a
[decoration](/docs/guide/#view.decorations), so that it only exists in
the user's interface. Let's start by writing a plugin that manages
such decorations.

PART(placeholderPlugin)

This is a thin wrapper around a [decoration
set](##view.DecorationSet)—it has to be a _set_ because multiple
uploads can be in progress at the same time. The meta property for the
plugin can be used to add and remove widget decorations by ID.

The plugin comes with a function that returns the current position of
the placeholder with the given ID, if it still exists.

PART(findPlaceholder)

When the file input below the editor is used, this event handler
checks some conditions, and fires off the upload when possible.

PART(event)

The core functionality happens in `startImageUpload`. The utility
`uploadFile` returns a promise that resolves to the uploaded
file's URL (in the demo it actually just waits for a bit and then
returns a `data:` URL).

PART(startImageUpload)

Because the placeholder plugin [maps](##view.DecorationSet.map) its
decorations through transactions, `findPlaceholder` will get the
accurate position of the image, even if the document was modified
during the upload.
