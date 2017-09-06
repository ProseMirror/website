const {rollup} = require("rollup")

let options = {
  entry: "bin/library.js",
  plugins: [
    require("rollup-plugin-node-resolve")({main: true}),
    require("rollup-plugin-commonjs")(),
    require("rollup-plugin-buble")(),
    require("rollup-plugin-uglify")()
  ],
  format: "iife"
}

rollup(options).then(bundle => bundle.generate(options)).then(
  output => console.log(output.code),
  error => { console.log(error.stack || error.message); process.exit(1) }
)
