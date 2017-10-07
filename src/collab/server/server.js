const {Step} = require("prosemirror-transform")

const {Router} = require("./route")
const {schema} = require("../schema")
const {getInstance, instanceInfo} = require("./instance")

const router = new Router

exports.handleCollabRequest = function(req, resp) {
  return router.resolve(req, resp)
}

// Object that represents an HTTP response.
class Output {
  constructor(code, body, type) {
    this.code = code
    this.body = body
    this.type = type || "text/plain"
  }

  static json(data) {
    return new Output(200, JSON.stringify(data), "application/json")
  }

  // Write the response.
  resp(resp) {
    resp.writeHead(this.code, {"Content-Type": this.type})
    resp.end(this.body)
  }
}

// : (stream.Readable, Function)
// Invoke a callback with a stream's data.
function readStreamAsJSON(stream, callback) {
  let data = ""
  stream.on("data", chunk => data += chunk)
  stream.on("end", () => {
    let result, error
    try { result = JSON.parse(data) }
    catch (e) { error = e }
    callback(error, result)
  })
  stream.on("error", e => callback(e))
}

// : (string, Array, Function)
// Register a server route.
function handle(method, url, f) {
  router.add(method, url, (req, resp, ...args) => {
    function finish() {
      let output
      try {
        output = f(...args, req, resp)
      } catch (err) {
        console.log(err.stack)
        output = new Output(err.status || 500, err.toString())
      }
      if (output) output.resp(resp)
    }

    if (method == "PUT" || method == "POST")
      readStreamAsJSON(req, (err, val) => {
        if (err) new Output(500, err.toString()).resp(resp)
        else { args.unshift(val); finish() }
      })
    else
      finish()
  })
}

// The root endpoint outputs a list of the collaborative
// editing document instances.
handle("GET", ["docs"], () => {
  return Output.json(instanceInfo())
})

// Output the current state of a document instance.
handle("GET", ["docs", null], (id, req) => {
  let inst = getInstance(id, reqIP(req))
  return Output.json({doc: inst.doc.toJSON(),
                      users: inst.userCount,
                      version: inst.version,
                      comments: inst.comments.comments,
                      commentVersion: inst.comments.version})
})

function nonNegInteger(str) {
  let num = Number(str)
  if (!isNaN(num) && Math.floor(num) == num && num >= 0) return num
  let err = new Error("Not a non-negative integer: " + str)
  err.status = 400
  throw err
}

// An object to assist in waiting for a collaborative editing
// instance to publish a new version before sending the version
// event data to the client.
class Waiting {
  constructor(resp, inst, ip, finish) {
    this.resp = resp
    this.inst = inst
    this.ip = ip
    this.finish = finish
    this.done = false
    resp.setTimeout(1000 * 60 * 5, () => {
      this.abort()
      this.send(Output.json({}))
    })
  }

  abort() {
    let found = this.inst.waiting.indexOf(this)
    if (found > -1) this.inst.waiting.splice(found, 1)
  }

  send(output) {
    if (this.done) return
    output.resp(this.resp)
    this.done = true
  }
}

function outputEvents(inst, data) {
  return Output.json({version: inst.version,
                      commentVersion: inst.comments.version,
                      steps: data.steps.map(s => s.toJSON()),
                      clientIDs: data.steps.map(step => step.clientID),
                      comment: data.comment,
                      users: data.users})
}

// An endpoint for a collaborative document instance which
// returns all events between a given version and the server's
// current version of the document.
handle("GET", ["docs", null, "events"], (id, req, resp) => {
  let version = nonNegInteger(req.query.version)
  let commentVersion = nonNegInteger(req.query.commentVersion)

  let inst = getInstance(id, reqIP(req))
  let data = inst.getEvents(version, commentVersion)
  if (data === false)
    return new Output(410, "History no longer available")
  // If the server version is greater than the given version,
  // return the data immediately.
  if (data.steps.length || data.comment.length)
    return outputEvents(inst, data)
  // If the server version matches the given version,
  // wait until a new version is published to return the event data.
  let wait = new Waiting(resp, inst, reqIP(req), () => {
    wait.send(outputEvents(inst, inst.getEvents(version, commentVersion)))
  })
  inst.waiting.push(wait)
  resp.on("close", () => wait.abort())
})

function reqIP(request) {
  return request.headers["x-forwarded-for"] || request.socket.remoteAddress
}

// The event submission endpoint, which a client sends an event to.
handle("POST", ["docs", null, "events"], (data, id, req) => {
  let version = nonNegInteger(data.version)
  let steps = data.steps.map(s => Step.fromJSON(schema, s))
  let result = getInstance(id, reqIP(req)).addEvents(version, steps, data.comment, data.clientID)
  if (!result)
    return new Output(409, "Version not current")
  else
    return Output.json(result)
})
