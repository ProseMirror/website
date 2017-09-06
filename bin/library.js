// Used as input to Rollup to generate the global that the examples
// depend on

import * as model from "prosemirror-model"
import * as transform from "prosemirror-transform"
import * as state from "prosemirror-state"
import * as view from "prosemirror-view"
import * as keymap from "prosemirror-keymap"
import * as inputrules from "prosemirror-inputrules"
import * as history from "prosemirror-history"
import * as commands from "prosemirror-commands"
import * as schema_basic from "prosemirror-schema-basic"
import * as schema_list from "prosemirror-schema-list"
import * as dropcursor from "prosemirror-dropcursor"
import * as gapcursor from "prosemirror-gapcursor"
import * as menu from "prosemirror-menu"
import * as example_setup from "prosemirror-example-setup"

window.PM = {
  model, transform, state, view, keymap, inputrules, history, commands,
  schema_basic, schema_list, dropcursor, menu, example_setup, gapcursor
}
  
