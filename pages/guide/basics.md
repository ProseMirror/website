!{"title": "ProseMirror Editing Guide",
  "template": "guide"}

# Basic Editing Guide

This guide describes the steps you take to put a ProseMirror editor in
your page.

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

This will find all depdendencies declared in your `main.js` file, and
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
var editor = new prosemirror.ProseMirror({
  place: document.body
})
```

That will create an instance of the [`ProseMirror`](##ProseMirror)
class, which is the editor, and append it to the document body. The
editor will, by default, be as high as its content. You can add a CSS
rule to set a fixed height (but note that scolling editable content
doesn't work well on some mobile platforms):

```css
.ProseMirror-content {
  height: 200px;
  overflow-y: auto;
}
```

Most aspects of the editor's appearance can be styled using CSS. The
wrapper around the whole editor has the class `ProseMirror`, and its
editable content has the class `ProseMirror-content`.

## Options

The object passed to the `ProseMirror` constructor lists the options
for this To add some content to your editor, you can use the
[`doc`](##doc) option to set the initial content of the editor. This
option normally expects a [document node](##Node) as its value, but
you can use the [`docFormat`](##docFormat) to select another
[format](##format). For example `"html"`:

```javascript
var prosemirror = require("prosemirror")
var editor = new prosemirror.ProseMirror({
  place: document.body,
  doc: "<h1>Hello world</h1><p>Edit me!</p>",
  docFormat: "html"
})
```

Options can be inspected and updated in an existing editor with the
[`getOption`](##ProseMirror.getOption) and
[`setOption`](##ProseMirror.setOption) methods.

## Content

To get your content out of an editor, you can use its
[`doc`](##ProseMirror.doc) property, which again contains a
[node](##Node) object, or its [`getContent`](##ProseMirror.getContent)
method, which allows you to specify an output [format](##format).

```javascript
editor.getContent("html")
```

There is an analogous [`setContent`](##ProseMirror.setContent) method
to replace the editor's content with a new document. But note that,
for incremental changes, you should use [transforms](./transform.html)
instead.

To destroy an editor, simply remove its
[wrapper](##ProseMirror.wrapper) node from the document.

## Commands

ProseMirror represents most editing actions the user can take as
[commands](##Command), which are objects that implement the
action and provide some information about it. Keys can be bound to
commands, the the items in the menus are also derived from commands.

The set of commands available in a given editor is determined with the
[`commands`](##commands) option. By default, it'll pull in a set of
[default commands](##baseCommands) and look for commands associated
with the editor's [schema](##schema).

Many of the built-in commands declare
[key bindings](##CommandSpec.keys) to which they are automatically
bound. You can use the `commands` option to change these if you wish,
or add your own keybindings by [defining](##CommandSpec) new commands
or by [registering](##ProseMirror.addKeymap) a keymap in an editor.

## Events

Editor instances fire a [range of events](##ProseMirror_events) that
your code can [subscribe](##EventMixin.on) to. For example, this
function will be called every time the content of the editor changes:

```javascript
editor.on("change", function() {
  scheduleDocumentSave(editor)
})
```

Some events pass arguments to their handler function:

```javascript
editor.on("optionChanged", function(name, value) {
  console.log("option " + name + " was set to", value)
})
```

You can use the [`signal`](##EventMixin.signal) method to fire your
own types of events.

## Modules

ProseMirror is built to be extendable. The distribution comes with a
few addon modules that add behavior, such as a
[menu bar](##menu/menubar), a [tooltip menu](##menu/tooltipmenu),
[text macros](##inputrules), and a system for
[collaborative editing](##collab).

Most addon modules work by [defining](##defineOption) a new option,
which must be set to enable their behavior. That way, simply loading a
module doesn't force you to use the new behavior in all editors on the
page—you can turn the behavior on and off by setting the value of the
option.
