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
server, it'll have to [rebase](../transform/#rebasing) its local
changes on top of those from the other editor, and try to submit them
again.

## The Authority

The role of the central authority is actually rather simple. It must...

 - Track a current document version

 - Accept changes from editors, and when these can be applied, add
   them to its list of changes

 - Provide a way for editors to receive changes since a given version

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

When the steps are accepted, they'll notice because the authority will
notify them that new steps are available, and then pass them _their
own_ steps. In a real implementation, you can also have `receiveSteps`
return a status, and immediately confirm the sent steps, as an
optimization. But the mechanism used here is necessary to guarantee
synchronization on unreliable connections, so you should always use it
as the base case.

This implementation of an authority keeps an endlessly growing array
of steps, the length of which denotes its current version.

## The `collab` Module

The [`collab`](##collab) module exports a [`collab`](##collab.collab)
function which returns a plugin, which will take care of the tracking
of local changes, receiving of remote changes, and indicating when
something has to be sent to the central authority.

```javascript
var EditorState = require("prosemirror-state").EditorState
var EditorView = require("prosemirror-view").EditorView
var schema = require("prosemirror-schema-basic").schema
var collab = require("prosemirror-collab")

function collabEditor(authority, place) {
  var view = new EditorView(place, {
    state: EditorState.create({schema: schema, plugins: [collab.collab()]}),
    dispatchTransaction: function(transaction) {
      var newState = view.state.apply(transaction)
      view.updateState(newState)
      var sendable = collab.sendableSteps(newState)
      if (sendable)
        authority.receiveSteps(sendable.version, sendable.steps,
                               sendable.clientID)
    }
  })

  authority.onNewSteps.push(function() {
    var newData = authority.stepsSince(collab.getVersion(view.state))
    view.dispatch(
      collab.receiveTransaction(view.state, newData.steps, newData.clientIDs))
  })

  return view
}
```

The `collabEditor` function creates an editor view that has the
`collab` plugin loaded. Whenever the state is updated, it checks
whether there is anything to send to the authority. If so, it sends
it.

It also registers a function that the authority should call when new
steps are available, and which creates a [transaction](##state.Transaction)
that updates our local editor state to reflect those steps.

When a set of steps gets rejected by the authority, they will remain
unconfirmed until, supposedly soon after, we receive new steps from
the authority. After that happens, because the `onNewSteps` callback
calls `dispatch`, which will call our `dispatchTransaction` function,
the code will try to submit its changes again.

That's all there is to it. Of course, with asynchronous data channels
(such as long polling in
[the collab demo](https://github.com/ProseMirror/website/blob/master/src/collab/client/collab.js)
or web sockets), you'll need somewhat more complicated communication
and syncronization code. And you'll probably also want your authority
to start throwing away steps at some point, so that its memory
consumption doesn't grow without bound. But the general approach is
fully described by this little example.
