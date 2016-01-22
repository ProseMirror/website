!{"title": "ProseMirror Collab Guide",
  "template": "guide"}

# Collaborative Editing Guide

Real-time collaborative editing allows multiple people to edit the
same document at the same time. Changes they make are applied
immediately to their local document, and then sent to peers, which
merge in these changes automatically (without manual conflict
resolution), so that editing can proceed uninterrupted, and the
documents keep converging.

This guide describes how to wire up ProseMirror's collaborative
editing functionality.

## Algorithm

ProseMirror's collaborative editing system employs a central authority
which determines in which order changes are applied. If two editors
make changes concurrently, they will both go to this authority with
their changes. The authority will tell one of them that yes, their
changes are accepted, and broadcase these changes to the other
editors. The other will get a reply saying that nope, their version of
the document is not up to date, and they have to receive changes,
[rebase](transform.html#rebasing) their local changes on top of those,
and try to submit them again.

## The Authority

The role of the central authority is actually rather simple. It must...

 - Track a current document version

 - Tell editors that submit changes whether their changes are accepted
   (which can be done simply by comparing that editor's current
   version with the central version)

 - Provide a way for editors to receive new changes made by peers

Let's implement a trivial central authority that runs in the same
JavaScript environment as the editors.

```javascript
function Authority(doc) {
  this.doc = doc
  this.steps = []
}

require("prosemirror/dist/util/event").eventMixin(Authority)

Authority.prototype.receiveSteps = function(version, steps) {
  if (version != this.steps.length) return false

  var self = this
  // Apply and accumulate new steps
  steps.forEach(function(step) {
    self.doc = step.apply(self.doc).doc
    self.steps.push(step)
  })
  // Signal listeners (after we return)
  setTimeout(function() { self.signal("newSteps") }, 100)
  return true
}
```

When an editor wants to try and submit their changes to the authority,
they can call `receiveSteps` on it, passing the last version number
they received, along with the new changes they added on top of that.
The method will return `true` if the changes are accepted, and `false`
otherwise.

This implementation of an authority keeps an endlessly growing array
of steps, the length of which denotes its current version.

The `eventMixin` call adds event-related methods to this type, such as
[`on`](##EventMixin.on) and [`signal`](##EventMixin.signal). The
timeout is needed because our communication channels are synchronous,
and it would confuse the editor that is submitting the changes if the
event that there are new changes came in before its changes were
confirmed. It also models the fact that typical communication channels
are asynchronous—without it, it wouldn't even be possible in this
example setup to have concurrent changes. You could raise the timeout
delay if you wanted to experiment with conflicts.

## The `collab` Module

The [`collab`](##collab) module will take care of the tracking of
local changes, receiving of remote changes, and signalling when
something has to be sent to the central authority. If you load it, you
get a `collab` option which, when enabled, will attach a `.mod.collab`
object to your editor.

```javascript
var prosemirror = require("prosemirror")
require("prosemirror/dist/collab")

function collabEditor(authority, place) {
  var editor = new prosemirror.ProseMirror({
    doc: authority.doc,
    collab: {version: authority.steps.length},
    place: place
  })
  var collab = editor.mod.collab

  function send() {
    var data = collab.sendableSteps()
    if (authority.receiveSteps(data.version, data.steps))
      collab.confirmSteps(data)
  }

  collab.on("mustSend", send)

  authority.on("newSteps", function() {
    var newSteps = authority.steps.slice(collab.version)
    if (newSteps.length) collab.receive(newSteps)
    if (collab.hasSendableSteps()) send()
  })

  return editor
}
```

Here we load and the `collab` module, and define a function that
produces an editor wired up to a collaboration authority.

To do so, it wires up the `send` function to the collab module's
[`"mustSend"`](##Collab.event_mustSend) event. The function retrieves
the unconfirmed steps that the editor has and passes them to
`receiveSteps`, confirming them in the editor when that returns
`true`.

It also listens for the authority's `"newSteps"` event, and when that
fires, fetches the steps it did not have yet, and pushes them into the
editor with the [`receive`](##Collab.receive) method.

When a set of steps gets rejected by the authority, they will remain
unconfirmed until, supposedly soon after, we receive new steps from
the authority. After that happens, the code
[checks](##Collab.hasSendableSteps) whether there are unconfirmed
steps, and if so, tries to send them again.

That's all there is to it. Of course, with more complicated data
channels (such as long polling in
[the collab demo](https://github.com/ProseMirror/website/blob/master/src/demo/collab/client/collab.js)
or web sockets), you'll need somewhat more complicated communication
and syncronization code. And you'll probably also want your authority
to start throwing away steps at some point, so that its memory
consumption doesn't grow without bound. But the general approach is
fully described by this little example.
