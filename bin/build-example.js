const {rollup} = require("rollup")

let globals = {}, external = []
;("model transform state view keymap inputrules history commands schema-basic " +
  "schema-list dropcursor menu example-setup gapcursor").split(" ").forEach(name => {
  globals["prosemirror-" + name] = "PM." + name.replace(/-/g, "_")
  external.push("prosemirror-" + name)
})

let options = {
  input: process.argv[2],
  plugins: [
    require("@rollup/plugin-node-resolve").nodeResolve({main: true, preferBuiltins: false}),
    require("@rollup/plugin-json")(),
    require("@rollup/plugin-commonjs")(),
    require("@rollup/plugin-buble")()
  ],
  external,
  output: {format: "iife", globals}
}

rollup(options).then(bundle => bundle.generate(options.output)).then(
  output => console.log(output.code),
  error => { console.error(error.stack || error.message); process.exit(1) }
)
