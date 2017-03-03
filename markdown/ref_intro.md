This is the reference manual for the
[ProseMirror](http://prosemirror.net) rich text editor. It
lists and describes the full public API exported by the library.

For more introductory material, please see the [guides](/docs/).

ProseMirror is structured as a number of separate modules. This
reference manual describes the exported API per module. We'll usually
use the abbreviated module name here, but on NPM they are prefixed
with `prosemirror-`. So if you want to use something from the
[`state`](#state) module, you have to import it like this:

    var EditorState = require("prosemirror-state").EditorState
    var state = EditorState.create({schema: mySchema})

Or in ES6 syntax:

    import {EditorState} from "prosemirror-state"
    let state = EditorState.create({schema: mySchema})
