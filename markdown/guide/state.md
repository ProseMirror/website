What makes up the state of an editor? You have your document, of
course. And also the current selection. And there needs to be a way to
store the fact that the current set of marks has changed, when you for
example disable or enable a mark but haven't started typing with that
mark yet.

Those are the three main components of a ProseMirror state, and exist
on state objects as [`doc`](##state.EditorState.doc),
[`selection`](##state.EditorState.selection), and
[`storedMarks`](##state.EditorState.selection).

```javascript
import {schema} from "prosemirror-schema-basic"
import {EditorState} from "prosemirror-state"

let state = EditorState.create({schema})
console.log(state.doc.toString()) // An empty paragraph
console.log(state.selection.from) // 1, the start of the paragraph
```

But plugins may also need to store state—for example, the undo history
has to keep its history of changes. This is why the set of active
plugins is also stored in the state, and these plugins can define
additional slots for storing their own state.

## Selection

ProseMirror supports several types of selection (and allows 3rd-party
code to define new selection types). Selections are represented by
instances of (subclasses of) the [`Selection`](##state.Selection)
class. Like documents and other state-related values, they are
immutable—to change the selection, you create a new selection object
and a new state to hold it.

Selections have, at the very least, a start
([`.from`](##state.Selection.from)) and an end
([`.to`](##state.Selection.to)), as positions pointing into the
current document. Many selection types also distinguish between the
[_anchor_](##state.Selection.anchor) (unmoveable) and
[_head_](##state.Selection.head) (moveable) side of the selection, so
those are also required to exist on every selection object.

The most common type of selection is a [text
selection](##state.TextSelection), which is used for regular cursors
(when `anchor` and `head` are the same) or selected text. Both
endpoints of a text selection are required to be in inline positions,
i.e. pointing into nodes that allow inline content.

The core library also supports [node
selections](##state.NodeSelection), where a single document node is
selected, which you get, for example, when you ctrl/cmd-click a node.
Such a selection ranges from the position directly before the node to
the position directly after it.

## Transactions

During normal editing, new states will be derived from the state
before them. You may in some situations, such as loading a new
document, want to create a completely new state, but this is the
exception.

State updates happen by [applying](##state.EditorState.apply) a
[transaction](##state.Transaction) to an existing state, producing a
new state. Conceptually, they happen in a single shot: given the old
state and the transaction, a new value is computed for each component
of the state, and those are put together in a new state value.

```javascript
let tr = state.tr
console.log(tr.doc.content.size) // 25
tr.insertText("hello") // Replaces selection with 'hello'
let newState = state.apply(tr)
console.log(tr.doc.content.size) // 30
```

[`Transaction`](##state.Transaction) is a subclass of
[`Transform`](##transform.Transform), and inherits the way it builds
up a new document by applying [steps](##transform.Step) to an initial
document. In addition to this, transactions track selection and other
state-related components, and get some selection-related convenience
methods such as
[`replaceSelection`](##state.Transaction.replaceSelection).

The easiest way to create a transaction is with the [`tr`
getter](##state.EditorState.tr) on an editor state object. This
creates an empty transaction based on that state, to which you can
then add steps and other updates.

By default, the old selection is [mapped](##state.Selection.map)
through each step to produce a new selection, but it is possible to
use [`setSelection`](##state.Transaction.setSelection) to explicitly
set a new selection.

```javascript
let tr = state.tr
console.log(tr.selection.from) // → 10
tr.delete(6, 8)
console.log(tr.selection.from) // → 8 (moved back)
tr.setSelection(TextSelection.create(tr.doc, 3))
console.log(tr.selection.from) // → 3
```

Similarly, the [set of active marks](##state.EditorState.storedMarks)
is automatically cleared after a document or selection change, and can
be set using the
[`setStoredMarks`](##state.Transaction.setStoredMarks) or
[`ensureMarks`](##state.Transaction.ensureMarks) methods.

Finally, the [`scrollIntoView`](##state.Transaction.scrollIntoView)
method can be used to ensure that, the next time the state is drawn,
the selection is scrolled into view. You probably want to do that for
most user actions.

Like `Transform` methods, many `Transaction` methods return the
transaction itself, for convenient chaining.

## Plugins

When [creating](##state.EditorState.create) a new state, you can
provide an array of plugins to use. These will be stored in the state
and any state that is derived from it, and can influence both the way
transactions are applied and the way an editor based on this state
behaves.

Plugins are instances of the [`Plugin` class](##state.Plugin), and can
model a wide variety of features. The simplest ones just add some
[props](##view.EditorProps) to the editor view, for example to respond
to certain events. More complicated ones might add new state to the
editor and update it based on transactions.

When creating a plugin, you pass it [an object](##state.PluginSpec)
specifying its behavior:

```javascript
let myPlugin = new Plugin({
  props: {
    handleKeyDown(view, event) {
      console.log("A key was pressed!")
      return false // We did not handle this
    }
  }
})

let state = EditorState.create({schema, plugins: [myPlugin]})
```

When a plugin needs its own state slot, that is defined with a
[`state`](##state.PluginSpec.state) property:

```javascript
let transactionCounter = new Plugin({
  state: {
    init() { return 0 },
    apply(tr, value) { return value + 1 }
  }
})

function getTransactionCount(state) {
  return transactionCounter.getState(state)
}
```

The plugin in the example defines a very simple piece of state that
simply counts the number of transactions that have been applied to a
state. The helper function uses the plugin's
[`getState`](##state.Plugin.getState) method, which can be used to
fetch the plugin state from a full editor state object.

It is often useful for plugins to add some extra information to a
transaction. For example, the undo history, when performing an actual
undo, will mark the resulting transaction, so that when the plugin
sees it, instead of doing the thing it normally does with changes
(adding them to the undo stack), it treats it specially, removing the
top item from the undo stack and adding this transaction to the redo
stack instead.

For this purpose, transactions allow
[_metadata_](##state.Transaction.getMeta) to be attached to them. We
could update our transaction counter plugin to not count transactions
that are marked, like this:

```javascript
let transactionCounter = new Plugin({
  state: {
    init() { return 0 },
    apply(tr, value) {
      if (tr.getMeta(transactionCounter)) return value
      else return value + 1
    }
  }
})

function markAsUncounted(tr) {
  tr.setMeta(transactionCounter, true)
}
```

Keys for metadata properties can be strings, but to avoid name
collisions, you are encouraged to use plugin objects. There are some
string keys that are given a meaning by the library, for example
`"addToHistory"` can be set to `false` to prevent a transaction from
being undoable, and when handling a paste, the editor view will set
the `"paste"` property on the resulting transaction to true.
