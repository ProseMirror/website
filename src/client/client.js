import {Node} from "prosemirror/dist/model"
import {ProseMirror} from "prosemirror/dist/edit"
import "prosemirror/dist/collab"
import "prosemirror/dist/inputrules/autoinput"
import "prosemirror/dist/menu/inlinetooltip"
import "prosemirror/dist/menu/menu"

import {GET, POST} from "./http"
import "./comment"

function reportFailure(err) {
  console.log("FAILED:", err.toString()) // FIXME
}
function reportDelay(err) {
  console.log("DELAY:" + err.toString())
}

class CollabProseMirror {
  constructor(url, options, id) {
    this.url = url
    this.id = id
    this.baseOptions = options

    this.state = this.request = this.pm = this.collab = null
    this.backOff = 0

    this.init()
  }

  init() {
    this.state = "start"
    if (this.pm) this.pm.content.parentNode.removeChild(this.pm.content)

    this.request = GET(this.url, (err, data) => {
      if (err) {
        reportFailure(err)
      } else {
        data = JSON.parse(data)
        let options = Object.create(this.baseOptions)
        options.doc = Node.fromJSON(data.doc)
        options.collab = {version: data.version}
        this.pm = new ProseMirror(options)
        this.collab = this.pm.mod.collab
        this.collab.on("mustSend", () => this.mustSend())
        this.backOff = 0
        this.poll()
      }
    })
  }

  poll() {
    this.state = "poll"
    let req = this.request = GET(this.url + "/steps/" + this.collab.version, (err, steps) => {
      if (this.request != req) return

      if (err && err.status == 410) { // Too far behind. Revert to server state
        this.init()
      } else if (err) {
        this.recover(err)
      } else {
        this.backOff = 0
        steps = JSON.parse(steps)
        if (steps.length)
          this.collab.receive(steps)
        if (this.collab.hasSendableSteps())
          this.send()
        else
          this.poll()
      }
    })
  }

  mustSend() {
    // Only interrupt polling -- in other situations we wait for the
    // current action to complete
    if (this.state == "poll") {
      this.request.abort()
      this.send()
    }
  }

  send() {
    this.state = "send"
    let sendable = this.collab.sendableSteps()
    let json = JSON.stringify({version: sendable.version, steps: sendable.steps})
    let req = this.request = POST(this.url + "/steps", json, "application/json", err => {
      if (this.request != req) return
      
      if (err && err.status == 409) { // Conflict
        this.backOff = 0
        this.poll()
      } else if (err) {
        this.recover(err)
      } else {
        this.backOff = 0
        this.collab.confirmSteps(sendable)
        if (this.collab.hasSendableSteps())
          this.send()
        else
          this.poll()
      }
    })
  }

  recover(err) {
    if (err.status && err.status < 500) {
      reportFailure(err)
    } else {
      this.state = "recover"
      let newBackOff = this.backOff ? Math.min(this.backOff * 2, 6e4) : 200
      if (newBackOff > 1000 && this.backOff < 1000) reportDelay(err)
      this.backOff = newBackOff
      setTimeout(() => {
        if (this.state != "recover") return
        console.log("timeout fired")
        if (this.collab.hasSendableSteps())
          this.send()
        else
          this.poll()
      }, this.backOff)
    }
  }
}

function start(id) {
  window[id] = new CollabProseMirror("/doc/test", {
    place: document.body,
    autoInput: true,
    inlineTooltip: true,
    menu: {followCursor: true}
  }, id)
}

start("pm1")
