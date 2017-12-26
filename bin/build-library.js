const {rollup} = require("rollup")

let plugins = [
  require("rollup-plugin-node-resolve")({main: true}),
  require("rollup-plugin-commonjs")(),
  require("rollup-plugin-buble")()
]

if (process.env.NODE_ENV != "development")
  plugins.push(require("rollup-plugin-uglify")())


let options = {
  input: "bin/library.js",
  plugins,
  output: {format: "iife"}
}

rollup(options).then(bundle => bundle.generate(options)).then(
  output => console.log(output.code),
  error => { console.error(error.stack || error.message); process.exit(1) }
)
