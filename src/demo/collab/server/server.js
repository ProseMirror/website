import {createServer} from "http"
import {Router} from "./route"

import {Step} from "prosemirror/dist/transform"
import {Pos, defaultSchema as schema} from "prosemirror/dist/model"

import {getInstance, instanceInfo} from "./instance"

const port = 8000

const router = new Router

const server = createServer((req, resp) => {
  if (!router.resolve(req, resp))
    new Output(404, "Not found").resp(resp)
})

server.listen(port)

class Output {
  constructor(code, body, type) {
    this.code = code
    this.body = body
    this.type = type || "text/plain"
  }

  static json(data) {
    return new Output(200, JSON.stringify(data), "application/json")
  }

  resp(resp) {
    resp.writeHead(this.code, {"Content-Type": this.type})
    resp.end(this.body)
  }
}

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

handle("GET", [], () => {
  return Output.json(instanceInfo())
})

handle("GET", [null], (id, req) => {
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

function stepJSON(step) {
  var obj = step.toJSON()
  obj.origin = step.origin
  return obj
}

function outputEvents(inst, data) {
  return Output.json({version: inst.version,
                      commentVersion: inst.comments.version,
                      steps: data.steps.map(stepJSON),
                      comment: data.comment})
}

handle("GET", [null, "events"], (id, req, resp) => {
  let version = nonNegInteger(req.query.version)
  let commentVersion = nonNegInteger(req.query.commentVersion)

  let inst = getInstance(id, reqIP(req))
  let data = inst.getEvents(version, commentVersion)
  if (data === false)
    return new Output(410, "History no longer available")
  if (data.steps.length || data.comment.length)
    return outputEvents(inst, data)
  let wait = new Waiting(resp, inst, reqIP(req), () => {
    wait.send(outputEvents(inst, inst.getEvents(version, commentVersion)))
  })
  inst.waiting.push(wait)
  resp.on("close", () => wait.abort())
})

function reqIP(request) {
  return request.headers["x-forwarded-for"] || request.socket.remoteAddress
}

handle("POST", [null, "events"], (data, id, req) => {
  let version = nonNegInteger(data.version)
  let steps = data.steps.map(s => Step.fromJSON(schema, s))
  let comments = data.comment.map(e => {
    if (e.from) e.from = Pos.fromJSON(e.from)
    if (e.to) e.to = Pos.fromJSON(e.to)
    return e
  })
  let ip = reqIP(req)
  let result = getInstance(id, ip).addEvents(version, steps, comments, ip)
  if (!result)
    return new Output(409, "Version not current")
  else
    return Output.json(result)
})
