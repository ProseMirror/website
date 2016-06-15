!{"title": "ProseMirror Editing Guide",
  "template": "guide"}

# Basic Editing Guide

This guide describes the steps you must take to put a simple
ProseMirror editor in your page.

## Bundling

ProseMirror's distribution does not come with a pre-bundled script
file. The upside of this is that you might not need to load all the
modules in the distribution, and doing your own bundling gives you a
clean way to pull in exactly the code you need. The downside is that
you have to mess around with a bundler before you can get anything
running.

“Bundling” JavaScript means taking a bunch of small modules that use
one of JavaScript's module conventions (such as
[CommonJS](http://wiki.commonjs.org/wiki/Modules/1.1), which the files
in the ProseMirror distribution use) and bundling them up in a way
that makes it possible (and quick) to run them in a browser. It is an
unfortunate artefact of the current state of the JavaScript ecosystem.

ProseMirror is written as a large amount of separate modules. Thus,
you'll need some intermediate step to run it.

The easiest way is to use [browserify](http://browserify.org/) to
bundle. You can see an example of doing this in the ProseMirror
[website repository](https://github.com/prosemirror/website/), which
has browserify declared as a dependencies in its `package.json` file,
and has commands that invoke them in its `Makefile`. For example:

    browserify main.js --outfile main_bundle.js

This will find all dependencies declared in your `main.js` file, and
the dependencies of those modules, and put them together in a big file
called `main_bundle.js`.

Running that on a big codebase takes a while, so during development,
this is a bit of a pain. One solution is to use `watchify`, which is
like `browserify`, but a persistent process that immediately updates
the bundle file whenever one of the files it depends on change. This
is faster, and doesn't require you to explitly run any commands every
time you want to test your code.

Other approaches to bundling are
[webpack](https://webpack.github.io/), [rollup](http://rollupjs.org/),
and [jspm](http://jspm.io/). You should be able to use any of them to
run ProseMirror.

## Creating an editor

To install ProseMirror, use [`npm`](https://www.npmjs.com/).

    npm install prosemirror

Pass the `--save` option to `npm install` to make it automatically add
the library as a dependency in your `package.json` file.

To use the library, you must at least import and instantiate it.

```javascript
var prosemirror = require("prosemirror")
var schema = require("prosemirror/dist/schema-basic").schema
var editor = new prosemirror.ProseMirror({
  place: document.body,
  schema: schema
})
```

That will create an instance of the [`ProseMirror`](##ProseMirror)
class, which is the editor, and append it to the document body. Every
editor needs a _schema_, which describes the structure of the content
that may appear in it. In the example, we use a the schema from the
`schema-basic` module.

The editor will, by default, be as high as its content. You can add a
CSS rule to set a fixed height (but note that scolling editable
content doesn't work well on some mobile platforms):

```css
.ProseMirror-content {
  height: 200px;
  overflow-y: auto;
}
```

Most aspects of the editor's appearance can be styled using CSS. The
wrapper around the whole editor has the class `ProseMirror`, and its
editable content has the class `ProseMirror-content`.

To destroy an editor, simply remove its
[wrapper](##ProseMirror.wrapper) node from the document.

The object passed to the `ProseMirror` constructor lists the options
for the instance. To add some content to your editor, you can use the
[`doc`](##doc) option to set the initial content of the editor. This
option expects a [document node](##Node) as its value. We could build
one up manually, using [methods](##Schema.node) on the schema, or
parse a part of our webpage.

```html
<div id=content style="display: none">
  <h2>Hello</h2>
  <p>This is a structured document.</p>
</div>
```

And then:

```javascript
var prosemirror = require("prosemirror")
var schema = require("prosemirror/dist/schema-basic").schema
var editor = new prosemirror.ProseMirror({
  place: document.body,
  schema: schema,
  doc: schema.parseDOM(document.querySelector("#content"))
})
```

## Content

To get your content out of an editor, you can use its
[`doc`](##ProseMirror.doc) property, which again contains a
[node](##Node) object.

```javascript
console.log(editor.doc.toJSON())
```

To replace the document, you can call the
[`setDoc`](##ProseMirror.setDoc) method. To update it, use a
transformation, as described in the [transform guide](transform.html).

## Commands and Key Bindings

ProseMirror represents most editing actions the user can take as
command functions, which take an editor instance as argument and
return a boolean that indicates whether they could perform their
action. Many of them are available in the `commands` object exported
by the `edit` module. Examples are `commands.deleteSelection`, which
deletes the selection if there is one, and
`commands.deleteCharBefore`, which deletes the character in front of
the cursor if there is such a character and the selection is empty.

Key bindings in ProseMirror are defined using the `Keymap` abstraction
from the [browserkeymap](https://github.com/marijnh/browserkeymap#readme)
module, which maps key names to such command functions. The editor has
a stack of keymaps. The initial one is set with the
[`keymap`](##option_keymap) option, and you can add more with the
[`addKeymap`](##ProseMirror.addKeymap) method.

When a key is pressed, the editor will look for bindings in each of
its keymaps, in order of priority, and continue until a command
function that returneds true when called is found.

## Events

Editor instances fire a [range of events](##ProseMirror.on) that your
code can [subscribe](https://github.com/marijnh/subscription#readme)
to. For example, this function will be called every time the content
of the editor changes:

```javascript
editor.on.change.add(function() {
  scheduleDocumentSave(editor)
})
```

Some events pass arguments to their handler function:

```javascript
editor.on.textInput.add(function(text) {
  console.log("you typed '" + text + "' into your editor")
})
```

## Modules and Plugins

ProseMirror is built to be extendable. The distribution comes with a
few addon modules that add behavior, such as a
[menu bar](##menuBar), a [tooltip menu](##tooltipMenu),
[text macros](##inputrules), and a system for
[collaborative editing](##collab).

Most such modules expose their functionality as a _plugin_, which you
can attach to an editor to enable the functionality. The easiest way
to do this is to include the plugin in the
[`plugins`](##option_plugins) option.

```javascript
var prosemirror = require("prosemirror")
var schema = require("prosemirror/dist/schema-basic").schema
var inputRules = require("prosemirror/dist/inputrules")

var editor = new prosemirror.ProseMirror({
  place: document.body,
  schema: schema,
  plugins: [
    inputRules.inputRules.config({rules: [inputRules.emDash]})
  ]
})
```

Plugins have a `config` method which takes an options object to
configure the plugin, and which you can optionally call before
enabling the plugin. In the example above, we are telling the
`inputRules` plugin to enable the `emDash` rule, which converts two
dashes into an emdash.
