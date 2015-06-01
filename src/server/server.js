import {createServer} from "http"
import Promise from "promise"
import {Router} from "./route"
import ecstatic from "ecstatic"

import {Step} from "prosemirror/dist/transform"

import {getInstance, getSteps, addSteps} from "./instance"

const port = 8000

const router = new Router
const fileServer = ecstatic({root: __dirname + "/../../public"})

const server = createServer((req, resp) => {
  router.resolve(req, resp) || fileServer(req, resp)
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
  var data = "";
  stream.on("data", function(chunk) {
    data += chunk;
  });
  stream.on("end", function() {
    var result, error;
    try { result = JSON.parse(data); }
    catch (e) { error = e; }
    callback(error, result);
  });
  stream.on("error", function(error) {
    callback(error);
  });
}

function handle(method, url, f) {
  router.add(method, url, (req, resp, ...args) => {
    function finish() {
      let output
      try {
        output = f(...args, req, resp)
      } catch (err) {
        output = new Output(500, err.toString())
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

handle("GET", ["doc", null], id => {
  let inst = getInstance(id)
  return Output.json({doc: inst.doc.toJSON(), version: inst.version})
})

function nonNegInteger(str) {
  let num = Number(str)
  if (!isNaN(num) && Math.floor(num) == num && num >= 0) return num
  throw new Error("Not a non-negative integer: " + str)
}

class Waiting {
  constructor(resp) {
    this.resp = resp
    this.done = false
    setTimeout(() => this.send([]), 1000 * 60 * 5)
  }

  send(steps) {
    if (this.done) return
    Output.json(steps.map(s => s.toJSON())).resp(this.resp)
    this.done = true
  }
}

handle("GET", ["doc", null, "steps", null], (id, version, _, resp) => {
  version = nonNegInteger(version)
  let steps = getSteps(id, version)
  if (steps === false)
    return new Output(410, "steps no longer available")
  if (steps.length)
    return Output.json(steps.map(s => s.toJSON()))
  let wait = new Waiting(resp)
  getInstance(id).waiting.push(() => wait.send(getSteps(id, version)))
})

handle("POST", ["doc", null, "steps"], (data, id) => {
  let version = nonNegInteger(data.version)
  let steps = data.steps.map(s => Step.fromJSON(s))
  if (addSteps(id, data.version, steps))
    return new Output(204)
  else
    return new Output(406, "Version not current")
})
