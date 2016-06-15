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
their changes. The authority will accept the changes from one of them,
and broadcast these changes to all editors. The other's changes will
not be accepted, and when that editor receives new changes from the
server, it'll have to [rebase](transform.html#rebasing) its local
changes on top of those from the other editor, and try to submit them
again.

## The Authority

The role of the central authority is actually rather simple. It must...

 - Track a current document version

 - Accept changes from editors, and when these can be applied, add
   them to its list of changes

 - Provide a way for editors to fetch changes since a given version

Let's implement a trivial central authority that runs in the same
JavaScript environment as the editors.

```javascript
function Authority(doc) {
  this.doc = doc
  this.steps = []
  this.stepClientIDs = []
  this.onNewSteps = []
}

Authority.prototype.receiveSteps = function(version, steps, clientID) {
  if (version != this.steps.length) return

  var self = this
  // Apply and accumulate new steps
  steps.forEach(function(step) {
    self.doc = step.apply(self.doc).doc
    self.steps.push(step)
    self.stepClientIDs.push(clientID)
  })
  // Signal listeners
  this.onNewSteps.forEach(function(f) { f() })
}

Authority.prototype.stepsSince = function(version) {
  return {
    steps: this.steps.slice(version),
    clientIDs: this.stepClientIDs.slice(version)
  }
}
```

When an editor wants to try and submit their changes to the authority,
they can call `receiveSteps` on it, passing the last version number
they received, along with the new changes they added, and their client
ID (which is a way for them to later recognize which changes came from
them).

This implementation of an authority keeps an endlessly growing array
of steps, the length of which denotes its current version.

## The `collab` Module

The [`collab`](##collab) module will take care of the tracking of
local changes, receiving of remote changes, and signalling when
something has to be sent to the central authority. It exports a
[`collabEditing`](##collabEditing) plugin which, when enabled, will
attach itself to your editor and act as a communication channel
between the editor and the authority.

```javascript
var prosemirror = require("prosemirror")
var collabEditing = require("prosemirror/dist/collab").collabEditing

function collabEditor(authority, place) {
  var editor = new prosemirror.ProseMirror({
    doc: authority.doc,
    place: place,
    plugins: [collabEditing.config({version: authority.steps.length})]
  })
  var collab = collabEditing.get(editor)

  function send() {
    var data = collab.sendableSteps()
    authority.receiveSteps(data.version, data.steps, data.clientID)
  }

  collab.mustSend.add(send)

  authority.onNewSteps.push(function() {
    var newData = authority.stepsSince(collab.version)
    collab.receive(newData.steps, newData.clientIDs)
    if (collab.hasSendableSteps()) send()
  })

  return editor
}
```

Here we load the `collab` module, and define a function that produces
an editor wired up to a collaboration authority.

To do so, it wires up the `send` function to the collab module's
[`"mustSend"`](##Collab.event_mustSend) event. The function retrieves
the unconfirmed steps that the editor has and passes them to
`receiveSteps`.

It also adds a listener to the authority's `onNewSteps` array, and
when that is called, fetches the steps it did not have yet, and pushes
them into the editor with the [`receive`](##Collab.receive) method.

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
