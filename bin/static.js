const {createServer} = require("http")
const staticServe = require("ecstatic")({
  root: __dirname + "/../public",
  cache: "no-cache, no-store, must-revalidate",
  headers: {pragma: "no-cache", expires: "0"}
})

createServer(staticServe).listen(8000)
console.log("Listening on 8000")
