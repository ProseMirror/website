const {rollup} = require("rollup")

let plugins = [
  require("@rollup/plugin-node-resolve").nodeResolve({main: true}),
  require("@rollup/plugin-commonjs")()
]

if (process.env.NODE_ENV != "development")
  plugins.push(require("rollup-plugin-terser").terser())

let options = {
  input: "bin/library.js",
  plugins,
  output: {format: "iife"}
}

rollup(options).then(bundle => bundle.generate(options.output)).then(
  bundle => console.log(bundle.output[0].code),
  error => { console.error(error.stack || error.message); process.exit(1) }
)
