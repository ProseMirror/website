const {createServer} = require("http")
const path = require("path")
const {parse: parseURL} = require("url")
const fs = require("fs")

const ModuleServer = require("moduleserve/moduleserver")
const {handleCollabRequest} = require("./collab/server/server")
const ecstatic = require("ecstatic")

let port = 8000
const root = path.resolve(__dirname, "../../public/")

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

let cachedDemoPages = Object.create(null)
let demos = {
  "/index.html": "../src/demo/basic",
  "/demo/basic.html": "../src/demo/basic",
  "/demo/markdown.html": "../src/demo/markdown",
  "/demo/dino.html": "../src/demo/dino",
  "/demo/lint.html": "../src/demo/lint",
  "/demo/track.html": "../src/demo/track",
  "/demo/collab.html": "../src/demo/collab/client/collab"
}

function transformDemoPage(req, resp) {
  let path = parseURL(req.url).pathname
  if (path == "/") path = "/index.html"
  let match = demos.hasOwnProperty(path) && demos[path]
  if (!match) return false

  let cached = cachedDemoPages[path]
  if (!cached) {
    let file = fs.readFileSync(root + path, "utf8")
    file = file.replace(/<script src="(demo\/)?bundle_[^"]+"><\/script>/,
                        '<script src="/moduleserve/load.js" data-module="' + demos[path] + '" data-require></script>')
    cached = cachedDemoPages[path] = file
  }
  resp.writeHead(200, {"Content-Type": "text/html"})
  resp.end(cached)
  return true
}

createServer((req, resp) => {
  handleCollabRequest(req, resp) ||
    moduleServer.handleRequest(req, resp) ||
    transformDemoPage(req, resp) ||
    fileServer(req, resp)
}).listen(port)

console.log("Demo server listening on port " + port)
