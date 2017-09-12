This is the reference manual for the
[ProseMirror](http://prosemirror.net) rich text editor. It lists and
describes the full public API exported by the library. For more
introductory material, please see the [guide](/docs/guide/).

ProseMirror is structured as a number of separate modules. This
reference manual describes the exported API per module. If you want to
use something from the [`prosemirror-state`](#state) module, for
example, you can import it like this:

```javascript
var EditorState = require("prosemirror-state").EditorState
var state = EditorState.create({schema: mySchema})
```

Or, using ES6 syntax:

```javascript
import {EditorState} from "prosemirror-state"
let state = EditorState.create({schema: mySchema})
```
