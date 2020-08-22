const {rollup} = require("rollup")

let plugins = [
  require("@rollup/plugin-node-resolve").nodeResolve({main: true}),
  require("@rollup/plugin-commonjs")(),
  require("@rollup/plugin-buble")()
]

if (process.env.NODE_ENV != "development")
  plugins.push(require("rollup-plugin-uglify").uglify())

let options = {
  input: "bin/library.js",
  plugins,
  output: {format: "iife"}
}

rollup(options).then(bundle => bundle.generate(options.output)).then(
  bundle => console.log(bundle.output[0].code),
  error => { console.error(error.stack || error.message); process.exit(1) }
)
