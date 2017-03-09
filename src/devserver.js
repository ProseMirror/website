const {createServer} = require("http")
const path = require("path")
const {parse: parseURL} = require("url")

const ModuleServer = require("moduleserve/moduleserver")
const {handleCollabRequest} = require("./collab/server/server")
const ecstatic = require("ecstatic")
const {buildFile} = require("./build/buildfile")

let port = 8000
const root = path.resolve(__dirname, "../public/")

function usage(status) {
  console.log("Usage: demoserver [--port PORT] [--help]")
  process.exit(status)
}

for (let i = 2; i < process.argv.length; i++) {
  let arg = process.argv[i]
  if (arg == "--port") port = +process.argv[++i]
  else if (arg == "--help") usage(0)
  else usage(1)
}

let moduleServer = new ModuleServer({root: root})
let fileServer = ecstatic({root: root})

function transformPage(req, resp) {
  let path = parseURL(req.url).pathname
  let dir = /\/([^\.\/]+)?$/.exec(path)
  if (dir) path = (dir[1] ? path : path.slice(0, -1)) + "/index.html"

  if (!/\.html$/.test(path)) return false

  let text = buildFile(__dirname + "/../pages" + path).replace(
    /<script src="[^"]*prosemirror\.js"><\/script>\s+<script src="([^"]*\.js)"><\/script>/,
    function(_, script) {
      let base = path.replace(/\/[^\/]+$|^\//g, ""), full = /^\//.test(script) ? script : base + "/" + script
      let up = base ? base.replace(/[^\/]+/g, "..") + "/" : ""
      return `<script src="/moduleserve/load.js" data-module="./${up}../pages/${full}" data-require></script>`
    }
  )
  resp.writeHead(200, {"Content-Type": "text/html"})
  resp.end(text)
  return true
}

function maybeCollab(req, resp) {
  let url = req.url, backend = url.replace(/\/collab-backend\b/, "")
  if (backend != url) {
    req.url = backend
    if (handleCollabRequest(req, resp)) return true
    req.url = url
  }
  return false
}

createServer((req, resp) => {
  maybeCollab(req, resp) ||
    moduleServer.handleRequest(req, resp) ||
    transformPage(req, resp) ||
    fileServer(req, resp)
}).listen(port)

console.log("Demo server listening on port " + port)
