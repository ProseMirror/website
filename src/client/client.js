import {Node, nodeTypes} from "prosemirror/dist/model"
import {Step} from "prosemirror/dist/transform"
import {fromDOM} from "prosemirror/dist/convert/from_dom"
import {elt} from "prosemirror/dist/dom"
import {ProseMirror} from "prosemirror/dist/edit"
import "prosemirror/dist/collab"
import "prosemirror/dist/inputrules/autoinput"
import "prosemirror/dist/menu/inlinemenu"
import "prosemirror/dist/menu/buttonmenu"
import "prosemirror/dist/menu/menubar"

import {GET, POST} from "./http"
import {Reporter} from "./reporter"
import {CommentStore, CommentUI} from "./comment"
import {showOrigins} from "./origins"

// Crude way to prevent XSS (until we have configurable doc models)
delete nodeTypes.html_block
delete nodeTypes.html_tag

const report = new Reporter()

function badVersion(err) {
  return err.status == 400 && /invalid version/i.test(err)
}

class ServerConnection {
  constructor(pm, report) {
    this.pm = pm
    this.report = report
    new CommentUI(pm)
    pm.mod.connection = this
    this.url = null

    this.state = this.request = this.collab = this.comments = null
    this.backOff = 0
  }

  start(url, c) {
    this.state = "start"
    this.url = url

    if (this.request) this.request.abort()
    this.request = GET(this.url, (err, data) => {
      if (err) {
        this.report.failure(err)
      } else {
        this.report.success()
        data = JSON.parse(data)
        this.pm.setOption("collab", null)
        this.pm.setDoc(Node.fromJSON(data.doc))
        this.pm.setOption("collab", {version: data.version})
        this.collab = this.pm.mod.collab
        this.collab.on("mustSend", () => this.mustSend())
        this.comments = new CommentStore(this.pm, data.commentVersion)
        this.comments.on("mustSend", () => this.mustSend())
        data.comments.forEach(comment => this.comments.addJSONComment(comment))
        info.users.textContent = userString(data.users)
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

      if (err && (err.status == 410 || badVersion(err))) {
        // Too far behind. Revert to server state
        this.report.failure(err)
        this.start(this.url)
      } else if (err) {
        this.recover(err)
      } else {
        this.report.success()
        data = JSON.parse(data)
        this.backOff = 0
        if (data.steps && data.steps.length) {
          let maps = this.collab.receive(data.steps.map(j => Step.fromJSON(j)))
          showOrigins(this.pm, data.steps, maps)
        }
        if (data.comment && data.comment.length)
          this.comments.receive(data.comment, data.commentVersion)
        this.sendOrPoll()
        info.users.textContent = userString(data.users)
      }
    })
  }

  mustSend() {
    // Only interrupt polling -- in other situations we wait for the
    // current action to complete
    if (this.state == "poll") {
      this.request.abort()
      if (this.pm.doc.size > 40000) {
        this.pm.setOption("collab", null)
        this.report.failure("Document too big. Detached.")
        return
      }
      this.send()
    }
  }

  send() {
    this.state = "send"
    let sendable = this.collab.sendableSteps()
    let nComments = this.comments.hasUnsentEvents()
    let comments = this.comments.unsentEvents()
    let json = JSON.stringify({version: sendable.version,
                               steps: sendable.steps.map(s => s.toJSON()),
                               comment: comments})

    let req = this.request = POST(this.url + "/events", json, "application/json", err => {
      if (this.request != req) return

      if (err && err.status == 409) { // Conflict
        this.backOff = 0
        this.poll()
      } else if (err && badVersion(err)) {
        this.report.failure(err)
        this.start(this.url)
      } else if (err) {
        this.recover(err)
      } else {
        this.report.success()
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
      this.report.failure(err)
    } else {
      this.state = "recover"
      let newBackOff = this.backOff ? Math.min(this.backOff * 2, 6e4) : 200
      if (newBackOff > 1000 && this.backOff < 1000) this.report.delay(err)
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
  menuBar: {float: true},
  doc: fromDOM(document.querySelector("#help"))
})
new ServerConnection(pm, report)

let info = {
  name: document.querySelector("#docname"),
  users: document.querySelector("#users"),
}
document.querySelector("#changedoc").addEventListener("click", e => {
  GET("doc/", (err, data) => {
    if (err) report.failure(err)
    else showDocList(e.target, JSON.parse(data))
  })
})

function userString(n) {
  if (n == null) n = 1
  return "(" + n + " user" + (n == 1 ? "" : "s") + ")"
}

let docList
function showDocList(node, list) {
  if (docList) docList.parentNode.removeChild(docList)

  let ul = docList = document.body.appendChild(elt("ul", {class: "doclist"}))
  list.forEach(doc => {
    ul.appendChild(elt("li", {"data-name": doc.id},
                       doc.id + " " + userString(doc.users)))
  })
  ul.appendChild(elt("li", {"data-new": "true", style: "border-top: 1px solid silver; margin-top: 2px"},
                     "Create a new document"))

  let rect = node.getBoundingClientRect()
  ul.style.top = (rect.bottom + 10 + pageYOffset - ul.offsetHeight) + "px"
  ul.style.left = (rect.left - 5 + pageXOffset) + "px"

  ul.addEventListener("click", e => {
    if (e.target.nodeName == "LI") {
      ul.parentNode.removeChild(ul)
      docList = null
      if (e.target.hasAttribute("data-name"))
        location.hash = "#edit-" + encodeURIComponent(e.target.getAttribute("data-name"))
      else
        newDocument()
    }
  })
}
document.addEventListener("click", () => {
  if (docList) {
    docList.parentNode.removeChild(docList)
    docList = null
  }
})

function newDocument() {
  let name = prompt("Name the new document", "")
  if (name)
    location.hash = "#edit-" + encodeURIComponent(name)
}

function connectFromHash() {
  let isID = /^#edit-(.+)/.exec(location.hash)
  if (isID) {
    pm.mod.connection.start("doc/" + isID[1], () => pm.focus())
    info.name.textContent = decodeURIComponent(isID[1])
  }
}

addEventListener("hashchange", connectFromHash)
connectFromHash()

let menuStyle = document.querySelector("#menustyle")
menuStyle.addEventListener("change", () => {
  if (menuStyle.value == "bar") {
    pm.setOption("menuBar", {float: true})
    pm.setOption("inlineMenu", false)
    pm.setOption("buttonMenu", false)
  } else {
    pm.setOption("menuBar", false)
    pm.setOption("inlineMenu", true)
    pm.setOption("buttonMenu", {followCursor: true})
  }
})
