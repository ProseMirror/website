import {Node, fromDOM} from "prosemirror/dist/model"
import {ProseMirror} from "prosemirror/dist/edit"
import "prosemirror/dist/collab"
import "prosemirror/dist/inputrules/autoinput"
import "prosemirror/dist/menu/inlinetooltip"
import "prosemirror/dist/menu/menu"

import {GET, POST} from "./http"
import {CommentStore, CommentUI} from "./comment"
import {Hinter} from "./hinter"

function reportFailure(err) {
  console.log("FAILED:", err.toString()) // FIXME
}
function reportDelay(err) {
  console.log("DELAY:" + err.toString())
}

class ServerConnection {
  constructor(pm, url) {
    this.pm = pm
    new CommentUI(pm)
    pm.mod.connection = this
    this.url = null

    this.state = this.request = this.collab = this.comments = null
    this.backOff = 0
  }

  start(url, c) {
    this.state = "start"
    this.url = url

    this.request = GET(this.url, (err, data) => {
      if (err) {
        reportFailure(err)
      } else {
        data = JSON.parse(data)
        this.pm.setOption("collab", null)
        this.pm.setDoc(Node.fromJSON(data.doc))
        this.pm.setOption("collab", {version: data.version})
        this.collab = this.pm.mod.collab
        this.collab.on("mustSend", () => this.mustSend())
        this.comments = new CommentStore(this.pm, data.commentVersion)
        this.comments.on("mustSend", () => this.mustSend())
        data.comments.forEach(comment => this.comments.addJSONComment(comment))
        this.backOff = 0
        this.poll()
        if (c) c()
      }
    })
  }

  poll() {
    this.state = "poll"
    let url = this.url + "/events?version=" + this.collab.version + "&commentVersion=" + this.comments.version
    let req = this.request = GET(url, (err, data) => {
      if (this.request != req) return

      if (err && err.status == 410) { // Too far behind. Revert to server state
        this.start(this.url)
      } else if (err) {
        this.recover(err)
      } else {
        data = JSON.parse(data)
        this.backOff = 0
        if (data.steps && data.steps.length)
          this.collab.receive(data.steps)
        if (data.comment && data.comment.length) // FIXME map through unconfirmed maps
          this.comments.receive(data.comment, data.commentVersion)
        this.sendOrPoll()
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
    let nComments = this.comments.hasUnsentEvents()
    let comments = this.comments.unsentEvents()
    let json = JSON.stringify({version: sendable.version,
                               steps: sendable.steps,
                               comment: comments})

    let req = this.request = POST(this.url + "/events", json, "application/json", err => {
      if (this.request != req) return
      
      if (err && err.status == 409) { // Conflict
        this.backOff = 0
        this.poll()
      } else if (err) {
        this.recover(err)
      } else {
        this.backOff = 0
        this.collab.confirmSteps(sendable)
        if (nComments) this.comments.eventsSent(nComments)
        this.sendOrPoll()
      }
    })
  }

  sendOrPoll() {
    if (this.collab.hasSendableSteps() || this.comments.hasUnsentEvents())
      this.send()
    else
      this.poll()
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
        this.sendOrPoll()
      }, this.backOff)
    }
  }
}

let pm = window.pm = new ProseMirror({
  place: document.querySelector("#editor"),
  autoInput: true,
  inlineTooltip: true,
  menu: {followCursor: true},
  doc: fromDOM(document.querySelector("#help"))
})
new ServerConnection(pm)

let idInput = document.querySelector("#docname")
let hinter = new Hinter(idInput, c => {
  GET("/doc", (err, data) => {
    if (!err) c(JSON.parse(data))
  })
}, picked => {
  location.hash = "#edit-" + encodeURIComponent(picked)
})

document.querySelector("#startdemo").addEventListener("submit", e => {
  e.preventDefault()
  location.hash = "#edit-" + encodeURIComponent(idInput.value)
})

function connectFromHash() {
  let isID = /^#edit-(.+)/.exec(location.hash)
  if (isID) {
    pm.mod.connection.start("/doc/" + isID[1], () => pm.focus())
    idInput.value = decodeURIComponent(isID[1])
  }
}
addEventListener("hashchange", connectFromHash)
connectFromHash()
