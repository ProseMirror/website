!{"template": "example", "title": "ProseMirror menu example"}

# Adding a menu

Most of the examples use the [example setup
package](https://github.com/prosemirror/prosemirror-example-setup) to
create a menu, but we actually don't recommend using that and the
example [menu
package](https://github.com/prosemirror/prosemirror-menu) in actual
production, since they are rather simplistic, opinionated modules, and
you're likely to run into their limitations rather quickly.

This example will go through building a custom (and ugly) menu for a
ProseMirror editor.

@HTML

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/prosemirror-demo-menu)

The idea is, roughly, to create a number of user interface elements
and tie them to [commands](/docs/guide/#commands). When clicked, they
should execute these commands on the editor.

One question is how to deal with commands that aren't always
applicable—when you are in a paragraph, should the control for ‘make
this a paragraph’ be shown? If so, should it be grayed out? This
example will simply hide buttons when their command is not currently
applicable.

To be able to do that, it needs to update the menu structure every
time the editor state changes. (Depending on the number of items in
your menu, and the amount of work required for determining whether
they are applicable, this can get expensive. There's no real solution
for this, except either keeping the number and complexity of the
commands low, or not changing the look of your menu depending on
state.)

If you already have some kind of dataflow abstraction that you're
routing ProseMirror updates though, writing the menu as a separate
component and connecting it to the editor state should work well. If
not, a plugin is probably the easiest solution.

The component for the menu might look something like this:

PART(MenuView)

It takes an array of menu items, which are objects with `command` and
`dom` properties, and puts those into a menu bar element. Then, it
wires up an event handler which, when a mouse button is pressed on
this bar, figures out which item was clicked, and runs the
corresponding command.

To update the menu for a new state, all commands are run without
dispatch function, and the items for those that return false are
hidden.

Wiring this component to an actual editor view is a bit awkward—it
needs access to the editor view when initialized, but at the same
time, that editor view's
[`dispatchTransaction`](##view.DirectEditorProps.dispatchTransaction)
prop needs to call its update method. Plugins can help here. They
allow you define a [plugin view](##state.PluginSpec.view), like this:

PART(menuPlugin)

When an editor view is initialized, or when the set of plugins in its
state change, the plugin views for any plugins that define them get
initialized. These plugin views then have their `update` method called
every time the editor's state is updated, and their `destroy` method
called when they are torn down. So by adding this plugin to an editor,
we can make sure that the editor view gets a menu bar, and that this
menu bar is kept in sync with the editor.

The actual menu items might look like this, for a basic menu with
strong, emphasis, and block type buttons.

PART(menu)

The [`prosemirror-menu`
package](https://github.com/prosemirror/prosemirror-menu) works
similarly, but adds support for things like simple drop-down menus and
active/inactive icons (to highlight the strong button when strong text
is selected).
