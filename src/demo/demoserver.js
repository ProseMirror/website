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
  collab: "../src/demo/collab/client/collab",
}

function transformDemoPage(req, resp) {
  let url = parseURL(req.url)
  let match = /^\/demo\/([^\/\.]+)\.html$/.exec(url.pathname)
  if (!match || !demos.hasOwnProperty(match[1])) return false
  let cached = cachedDemoPages[match[1]]
  if (!cached) {
    let file = fs.readFileSync(root + url.pathname, "utf8")
    file = file.replace(/<script src="bundle_[^"]+"><\/script>/,
                        '<script src="/moduleserve/load.js" data-module="' + demos[match[1]] + '" data-require></script>')
    cached = cachedDemoPages[match[1]] = file
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
