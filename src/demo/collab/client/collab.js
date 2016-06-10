const {defaultSchema: schema} = require("prosemirror/dist/schema")
const {defaultSetup} = require("prosemirror/dist/schema/defaultsetup")
const {Step} = require("prosemirror/dist/transform")
const {fromDOM} = require("prosemirror/dist/htmlformat")
const {elt} = require("prosemirror/dist/util/dom")
const {ProseMirror, Plugin} = require("prosemirror/dist/edit")
const {collabEditing} = require("prosemirror/dist/collab")
const {MenuItem} = require("prosemirror/dist/menu/menu")

const {GET, POST} = require("./http")
const {Reporter} = require("./reporter")
const {commentPlugin, commentUIPlugin, addAnnotation, annotationIcon} = require("./comment")
const {showOrigins} = require("./origins")

const report = new Reporter()

function badVersion(err) {
  return err.status == 400 && /invalid version/i.test(err)
}

// A class to manage the connection to the collaborative editing server,
// sending and retrieving the document state.
const connectionPlugin = new Plugin(class ServerConnection {
  constructor(pm, options) {
    this.pm = pm
    commentUIPlugin.attach(pm)
    this.url = null

    this.state = this.request = this.collab = this.comments = null
    this.backOff = 0
  }

  // Get the current state of the document from the collaboration
  // server and bootstrap the editor instance with the data.
  start(url, c) {
    this.state = "start"
    this.url = url

    if (this.request) this.request.abort()
    this.request = GET(this.url, (err, data) => {
      if (err) {
        report.failure(err)
      } else {
        report.success()
        data = JSON.parse(data)
        collabEditing.detach(this.pm)
        this.pm.setDoc(this.pm.schema.nodeFromJSON(data.doc))
        collabEditing.config({version: data.version}).attach(this.pm)
        this.collab = collabEditing.get(this.pm)
        this.collab.mustSend.add(() => this.mustSend())
        this.comments = commentPlugin.config({version: data.commentVersion}).attach(this.pm)
        this.comments.mustSend.add(() => this.mustSend())
        data.comments.forEach(comment => this.comments.addJSONComment(comment))
        info.users.textContent = userString(data.users)
        this.backOff = 0
        this.poll()
        if (c) c()
      }
    })
  }

  // Send a request for events that have happened since the version
  // of the document that the client knows about. This request waits
  // for a new version of the document to be created if the client
  // is already up-to-date.
  poll() {
    this.state = "poll"
    let url = this.url + "/events?version=" + this.collab.version + "&commentVersion=" + this.comments.version
    let req = this.request = GET(url, (err, data) => {
      if (this.request != req) return

      if (err && (err.status == 410 || badVersion(err))) {
        // Too far behind. Revert to server state
        report.failure(err)
        this.start(this.url)
      } else if (err) {
        this.recover(err)
      } else {
        report.success()
        data = JSON.parse(data)
        this.backOff = 0
        if (data.steps && data.steps.length) {
          let maps = this.collab.receive(data.steps.map(j => Step.fromJSON(schema, j)), data.clientIDs)
          showOrigins(this.pm, data.steps.slice(data.steps.length - maps.length), maps)
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
      if (this.pm.doc.content.size > 40000) {
        collabEditing.detach(this.pm)
        report.failure("Document too big. Detached.")
        return
      }
      this.send()
    }
  }

  sendOrPoll() {
    if (this.collab.hasSendableSteps() || this.comments.hasUnsentEvents())
      this.send()
    else
      this.poll()
  }

  // Send all unshared events to the server.
  send() {
    this.state = "send"
    let sendable = this.collab.sendableSteps()
    let nComments = this.comments.hasUnsentEvents()
    let comments = this.comments.unsentEvents()
    let json = JSON.stringify({version: sendable.version,
                               steps: sendable.steps.map(s => s.toJSON()),
                               clientID: sendable.clientID,
                               comment: comments})

    let req = this.request = POST(this.url + "/events", json, "application/json", err => {
      if (this.request != req) return

      if (err && err.status == 409) {
        // The client's document conflicts with the server's version.
        // Poll for changes and then try again.
        this.backOff = 0
        this.poll()
      } else if (err && badVersion(err)) {
        report.failure(err)
        this.start(this.url)
      } else if (err) {
        this.recover(err)
      } else {
        report.success()
        this.backOff = 0
        this.collab.receive(sendable.steps, repeat(sendable.clientID, sendable.steps.length))
        this.poll()
      }
    })
  }

  recover(err) {
    if (err.status && err.status < 500) {
      report.failure(err)
    } else {
      this.state = "recover"
      let newBackOff = this.backOff ? Math.min(this.backOff * 2, 6e4) : 200
      if (newBackOff > 1000 && this.backOff < 1000) report.delay(err)
      this.backOff = newBackOff
      setTimeout(() => {
        if (this.state != "recover") return
        this.sendOrPoll()
      }, this.backOff)
    }
  }
})

function repeat(val, n) {
  let result = []
  for (let i = 0; i < n; i++) result.push(val)
  return result
}

const annotationMenuItem = new MenuItem({
  title: "Add an annotation",
  run: addAnnotation,
  select: pm => addAnnotation(pm, false),
  icon: annotationIcon
})

let pm = window.pm = new ProseMirror({
  place: document.querySelector("#editor"),
  schema: schema,
  plugins: [
    connectionPlugin,
    defaultSetup.config({updateMenu(m) { m[0].push(annotationMenuItem); return m }}),
    connectionPlugin
  ]
})

let info = {
  name: document.querySelector("#docname"),
  users: document.querySelector("#users"),
}
document.querySelector("#changedoc").addEventListener("click", e => {
  GET("/docs/", (err, data) => {
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
    connectionPlugin.get(pm).start("/docs/" + isID[1], () => pm.focus())
    info.name.textContent = decodeURIComponent(isID[1])
    return true
  }
}

addEventListener("hashchange", connectFromHash)
connectFromHash() || (location.hash = "#edit-Example")
