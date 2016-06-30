const {createServer} = require("http")
const {handleCollabRequest} = require("./server")

const port = 8000

// The collaborative editing document server.
createServer((req, resp) => {
  if (!handleCollabRequest(req, resp)) {
    resp.writeHead(404, {"Content-Type": "text/plain"})
    resp.end("Not found")
  }
}).listen(port, "127.0.0.1")

console.log("Collab demo server listening on " + port)
