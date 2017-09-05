ProseMirror provides a set of tools and concepts for building rich
text editors, using user interface inspired by
what-you-see-is-what-you-get, but trying to avoid the pitfalls of that
style of editing.

The main principle of ProseMirror is that your code gets full control
over the document and what happens to it. This document isn't a blob
of HTML, but a custom data structure that only contains elements that
you explicitly allow it to contain, in relations that you specified.
All updates go through a single point, where you can inspect them and
react to them.

The core library is not an easy drop-in component—we are prioritizing
modularity and customizeability over simplicity, with the hope that,
in the future, people will distribute drop-in editors based on
ProseMirror. As such, this is more of a lego set than a matchbox car.

There are four core modules, which are required to do any editing at
all, and a number of extension modules maintained by the core team,
which have a status similar to that of 3rd party modules—they provide
useful functionality, but you may omit them or replace them with other
modules that implement similar functionality.

The core modules are:

 - [`prosemirror-model`](##model) defines the editor's [document
   model](#doc), the data structure used to describe the content
   of the editor.

 - [`prosemirror-state`](##state) provides the data structure that
   describes the editor's whole state, including the selection, and a
   transaction system for moving from one state to the next.

 - [`prosemirror-view`](##view) implements a user interface component
   that shows a given editor state as an editable element in the
   browser, and handles user interaction with that element.

 - [`prosemirror-transform`](##transform) contains functionality for
   modifying documents in a way that can be recorded and replayed,
   which is the basis for the transactions in the `state` module, and
   which makes the undo history and collaborative editing possible.

In addition, there are modules for [basic editing
commands](##commands), [binding keys](##keymap), [undo
history](##history), [input macros](##inputrule), [collaborative
editing](##collab), a [simple document schema](##schema-basic), and
more under the [GitHub prosemirror
organization](https://github.com/prosemirror/).

The fact that ProseMirror isn't distributed as a single,
browser-loadable script means that you'll probably want to use some
kind of bundler when using it. A bundler is a tool that automatically
finds your script's dependencies, and combines them into a single big
file that you can easily load from a web page. You can read more about
bundling on the web, for example
[here](https://medium.freecodecamp.org/javascript-modules-part-2-module-bundling-5020383cf306).

## My first editor

The lego pieces fit together like this to create a very minimal
editor:

```javascript
import {schema} from "prosemirror-schema-basic"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"

let state = EditorState.create({schema})
let view = new EditorView(document.body, {state})
```

ProseMirror requires you to specify a schema that your document
conforms to, so the first thing this does is import a module with a
basic schema in it.

That schema is then used to create a state, which will generate an
empty document conforming to the schema, and a default selection at
the start of that document. Finally, a view is created for the state,
and appended to `document.body`. This will render the state's document
as an editable DOM node, and generate state transactions whenever the
user types into it.

The editor isn't very usable yet. If you press enter, for example,
nothing happens, because the core library has no opinion on what enter
should do. We'll get to that in a moment.

## Transactions

When the user types, or otherwise interacts with the view, it
generates ‘state transactions’. What that means is that it does not
just modify the document in-place and implicitly update its state in
that way. Instead, every change causes a
[_transaction_](#state.transactions) to be created, which describes
the changes that are made to the state, and can be applied to create a
_new_ state, which is then used to update the view.

By default this all happens under the cover, but you can hook into by
writing [plugins](#state.plugins) or configuring your view. For
example, this code adds a
[`dispatchTransaction`](##view.DirectEditorProps.dispatchTransaction)
[prop](##view.EditorProps), which will be called whenever a
transaction is created:

```javascript
// (Imports omitted)

let state = EditorState.create({schema})
let view = new EditorView(document.body, {
  state,
  dispatchTransaction(transaction) {
    console.log("Document size went from", transaction.before.content.size,
                "to", transaction.doc.content.size)
    let newState = view.state.apply(transaction)
    view.updateState(newState)
  }
})
```

_Every_ state update has to go through
[`updateState`](##view.EditorView.updateState), and every normal
editing update will happen by dispatching a transaction.

## Plugins

Plugins are used to extend the behavior of the editor and editor state
in various ways. Some are relatively simple, like the
[keymap](##keymap) plugin that binds [actions](#commands) to
keyboard input. Others are more involved, like the
[history](##history) plugin which implements an undo history by
observing transactions and storing their inverse in case the user
wants to undo them.

Let's add those two plugins to our editor to get undo/redo
functionality:

```javascript
// (Omitted repeated imports)
import {undo, redo, history} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"

let state = EditorState.create({
  schema,
  plugins: [
    history(),
    keymap({"Mod-Z": undo, "Mod-Y": redo})
  ]
})
let view = new EditorView(document.body, {state})
```

Plugins are registered when creating a state (because they get access
to state transactions). After creating a view for this history-enabled
state, you'll be able to press Ctrl-Z (or Cmd-Z on OS X) to undo your
last change.

## Commands

The `undo` and `redo` values that the previous example bound to keys
are a special kind of functions called [_commands_](#commands).
Most editing actions are written as commands which can be bound to
keys, hooked up to menus, or otherwise exposed to the user.

The `prosemirror-commands` package provides a number of basic editing
commands, along with a minimal keymap that you'll probably want to
enable to have things like enter and delete do the expected thing in
your editor.

```javascript
// (Omitted repeated imports)
import {baseKeymap} from "prosemirror-commands"

let state = EditorState.create({
  schema,
  plugins: [
    history(),
    keymap({"Mod-Z": undo, "Mod-Y": redo}),
    keymap(baseKeymap)
  ]
})
let view = new EditorView(document.body, {state})
```

At this point, you have a basically working editor.

To add a menu, additional keybindings for schema-specific things, and
so on, you might want to look into the
[`prosemirror-example-setup`](https://github.com/prosemirror/prosemirror-example-setup)
package. This is a module that provides you with an array of plugins
that set up a baseline editor, but as the name suggests, it is meant
more as an example than as a production-level library. For a
real-world deployment, you'll probably want to replace it with custom
code that sets things up exactly the way you want.

## Content

A state's document lives under its [`doc`](##state.EditorState.doc)
property. This is a read-only data structure, representing the
document as a hierarchy of nodes, somewhat like the browser DOM. A
simple document might be a `"doc"` node containing two `"paragraph"`
nodes, each containing a single `"text"` node. You can read more about
the document data structure in the [guide](#doc) about it.

When initializing a state, you can give it an initial document to use.
In that case, the `schema` field is optional, since the schema can be
taken from the document.

Here we initialize a state by parsing the content found in the DOM
element with the ID `"content"`, using the DOM parser mechanism, which
uses information supplied by the schema about which DOM nodes map to
which elements in that schema:

```javascript
import {DOMParser} from "prosemirror-model"
import {EditorState} from "prosemirror-state"
import {schema} from "prosemirror-schema-basic"

let content = document.getElementById("content")
let state = EditorState.create({
  doc: DOMParser.fromSchema(schema).parse(content)
})
```
