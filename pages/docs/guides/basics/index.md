!{"title": "ProseMirror Editing Guide",
  "template": "guide"}

# Basic Editor Guide

This guide describes the steps you must take to put a simple
ProseMirror editor in your page.

## Bundling

ProseMirror consists of a number of different modules. The upside of
this is that you might not need to load all those modules, and you can
swap out pieces of the system as you see fit. Doing your own bundling
gives you a clean way to pull in exactly the code you need. The
downside is that you have to mess around with a bundler before you can
get anything running.

“Bundling” JavaScript means taking a bunch of small modules that use
one of JavaScript's module conventions (such as
[CommonJS](http://wiki.commonjs.org/wiki/Modules/1.1), which the files
in the ProseMirror distribution use) and bundling them up in a way
that makes it possible (and quick) to run them in a browser. It is an
unfortunate artefact of the current state of the JavaScript ecosystem.

The easiest way to bundle ProseMirror is to use
[NPM](https://www.npmjs.com/) and
[browserify](http://browserify.org/). Install Browserify and the
ProseMirror modules you need through NPM.

    npm install prosemirror-state
    npm install prosemirror-view
    npm install prosemirror-schema-basic
    npm install browserify

Next, create a file that uses ProseMirror, for example:

    var EditorState = require("prosemirror-state").EditorState
    var EditorView = require("prosemirror-view").EditorView
    var schema = require("prosemirror-schema-basic").schema

    var view = new EditorView(document.body, {
      state: EditorState.create({schema: schema}),
    })

We'll go over what that code does in a moment. To create a bundle for
your file, you can run something like this:

    browserify main.js --outfile main_bundle.js

This will find all dependencies declared in your script file, and
the dependencies of those modules, and put them together in a big file
called `main_bundle.js`.

If you include that in a webpage, and also add a link tag to load the
editor's style sheet, you should have a working editor.

    <!doctype html>
    <meta charset=utf8>
    <link rel=stylesheet
      href="path/to/node_modules/prosemirror-view/style/prosemirror.css">
    <style>.ProseMirror { background: silver }</style>
    <body>
      <script src="main_bundle.js"></script>
    </body>

Running browserify on a big codebase takes a while, so during
development, this is a bit of a pain. One solution is to use
[`watchify`](https://github.com/substack/watchify), which is like `browserify`, but a persistent process that
immediately updates the bundle file whenever one of the files it
depends on change. This is faster, and doesn't require you to explitly
run any commands every time you want to test your code.

Other approaches to bundling are
[webpack](https://webpack.github.io/), [rollup](http://rollupjs.org/),
and [jspm](http://jspm.io/). You should be able to use any of them to
run ProseMirror.

## Structure of an Editor

A ProseMirror _view_ (the `EditorView` class) is a component
responsible for showing the editable document in the browser, and
handling user interaction with that document.

It is not, however, responsible for tracking state. There is a
separate type of object, of the `EditorState` class, that holds the
editor's current state—what the document is, where the selection or
cursor is, and so on.

When the user interacts with the document, for example by typing
something, the view generates [`Transaction`s](##state.Transaction),
which can be [applied](##state.EditorState.apply) to the state to
produce a new, updated state.

If you don't do anything special, the view will automatically move to
a new state whenever it dispatches a transaction. But you can provide
the view with a custom
[`dispatchTransaction`](##view.EditorProps.dispatchTransaction)
function, which puts you in full control of its update cycle—it'll
only update when you tell it to.

Let's go over the example code again:

    var view = new EditorView(document.body, {
      state: EditorState.create({schema: schema})
    })

The view constructor expects a place in the DOM as the first argument
(either a node to append to a or a function that will place a DOM
node), and a set of _props_ as the second. 'Props' is used in the
[React sense](https://facebook.github.io/react/docs/tutorial.html#using-props),
as a set of values that determine the entire behavior of the
component. The editor view has no (visible) state beyond its props.

In this case, we're passing only the editor state. There are
[others](##view.EditorProps), for example
[`handleKeyDown`](##view.EditorProps.handleKeyDown), which allows you
to handle key events, and
[`attributes`](##view.EditorProps.attributes), which allows you to
specify additional attributes for the editable DOM element.

The editor state is initialized with the `EditorState.create`
function, which also takes an object that can be used to configure the
newly created state. In the example, we only pass the single required
field, `schema`, which determines the
[document schema](##model.Schema) that our editor uses.

To clean up an editor view, call its
[`destroy`](##view.EditorView.destroy) method.

## Content

To get at the content of your editor, you can access the state's
[`doc`](##state.EditorState.doc) property. This holds an object of the
[`Node`](##model.Node) type, which is further described in the
[document guide](../doc/).

When initializing a state, you can of course give it an initial
document to use. In that case, the `schema` field is optional, since
the schema can be derived from the document.

Here we initialize a state by parsing the content found in the DOM
element with the `content` ID:

    var content = document.getElementById("content")
    var state = EditorState.create({
      doc: DOMParser.fromSchema(schema).parse(content)
    })

Documents, as well as entire states, can be serialized to JSON with
their [`toJSON`](##model.Node.toJSON) methods, and parsed with the
static [`fromJSON`](##model.Node^fromJSON) methods on their
constructors.

```javascript
console.log(state.doc.toJSON())
```

To make programmatic changes to the editor content, you can use
transforms, as described in the [transform guide](../transform/).

## Plugins and Commands

The editor we've created so far doesn't really do a lot. Its schema
supports strong and emphasised text, block quotes and horizontal
rules, but there's no way to actually insert them, short of pasting in
the corresponding HTML.

The ProseMirror core is intentionally bare, since specific sites will
often want to do things differently, and you don't want to have your
users download functionality they don't need. To make it possible to
add functionality to the editor in a modular way, ProseMirror supports
plugins.

Plugins are values that extend your editor. You can pass an array of
them when you create your state, and they can add their own state and
define props to influence the view's behavior.

The maintainers of ProseMirror provide several plugins, and hopefully
we'll see a growing number of 3rd-party plugins in the future. One
example is the [prosemirror-history](##history) plugin, which
implements an undo/redo history. Here's how you could use it:

    /* ... same imports as before ... */
    var history = require("prosemirror-history")

    var view = new EditorView(document.body, {
      state: EditorState.create({schema: schema,
                                 plugins: [history.history()]}),
      // (This'll get less ugly soon)
      handleKeyDown: function(view, event) {
        if (event.ctrlKey && event.keyCode == 90)
          return history.undo(view.state, view.dispatch)
      }
    })

The changes are that we pass `plugins: [history.history()]` when
creating the state, to enable the history plugin, and that we add a
`handleKeyDown` prop which, when Ctrl-Z is pressed, calls
`history.undo`.

That latter function follows ProseMirror's _command_ interface,
meaning that it is a function that takes a state and a dispatch
function, and returns a boolean that indicates whether it could
perform its editing command. In this case, it'll call `dispatch` with
a transaction that causes an undo to happen, and return true, when the
given state has an undo event available.

Of course, binding keys by manually looking at key events is awful and
error-prone (the code above will also handle Ctrl-Alt-Z, and won't
handle Cmd-Z on Mac platforms), so we'd rather not do that. Another
plugin to the rescue: [prosemirror-keymap](##keymap).

This one exports a function that takes a mapping from key names to
command functions, and returns a plugin whose `handleKeyDown` prop
will execute those commands when the corresponding key is pressed.

    /* ... same imports as before ... */
    var history = require("prosemirror-history")
    var keymap = require("prosemirror-keymap").keymap

    var view = new EditorView(document.body, {
      state: EditorState.create({
        schema: schema,
        plugins: [history.history(), keymap({
          "Mod-z": history.undo,
          "Mod-y": history.redo
        })]
      })
    })

The keymap plugin will interpret `Mod` to mean the Command key on Mac,
and Control on other platforms, so that now our binding works as
intended. We've also added one for undo.

Note that the order in which the plugins are given is significant—if
you provide multiple keymaps, the one that comes firsts in the array
gets to handle events first.

The [prosemirror-commands](##commands) module exports a lot of other
command functions, along with an object that can be passed to `keymap`
to create a basic keymap with schema-agnostic key bindings (such as
backspace and enter). Since schemas are configurable, you'll have to
arrange appropriate key bindings that are related to your content
elements (such as strong and emphasis marks) yourself.

Another potentially useful plugin is
[prosemirror-inputrules](##inputrules), which allows you to define
special behavior to be executed when certain patterns of text are
typed, such as smart quotes, or automatically creating a list when a
paragraph starts with a dash and a space.

## Props

We briefly looked at props before. Many props take the shape of
callbacks that are called when a certain thing happens. The ones where
the event can be prevented, such as
[`handleKeyDown`](##view.EditorProps.handleKeyDown), can return true
to indicate that they handled the event and no further action needs to
be taken.

There's a [`handleKeyPress`](##view.EditorProps.handleKeyPress) for
key press events, and clicks on the editor get passed to
[`handleClick`](##view.EditorProps.handleClick), but first, for each
node around the click,
[`handleClickOn`](##view.EditorProps.handleClickOn) is called, to
allow node-specific handling. There are also variants of the click
handlers for double and triple clicks.

Other props merely notify you that something changed, such as
[`onFocus`](##view.EditorProps.onFocus), and can't prevent the
behavior.

And for more advanced use cases, there is the
[`decorations`](##view.EditorProps.decorations) prop which allows you
to overlay styling and widgets on your document, and the
[`nodeViews`](##view.EditorProps.nodeViews) prop which allows you to
customize the way the DOM representation of specific document nodes
works.
