ProseMirror is distributed as a set of JavaScript modules. This
reference manual describes the exported API per module. So if you want
to use something from the [`edit`](#edit) module, you have to import
it from there.

    var edit = require("prosemirror/dist/edit")
    var editor = new edit.ProseMirror()

Or in ES6 syntax:

    import {ProseMirror} from "prosemirror/dist/edit"
    let editor = new ProseMirror()

Note that the content of the `dist` directory only exists in a built
version of code. If you are getting it from `npm`, you should be fine.
If you manually cloned the
[git repository](https://github.com/prosemirror/prosemirror), you'll
need to `npm install` inside of it first.
