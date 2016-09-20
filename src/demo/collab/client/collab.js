const {exampleSetup, buildMenuItems} = require("prosemirror-example-setup")
const {Step} = require("prosemirror-transform")
const {MenuBarEditorView} = require("prosemirror-menu")
const {EditorState} = require("prosemirror-state")
const {history} = require("prosemirror-history")
const {collab, receiveAction, sendableSteps, getVersion} = require("prosemirror-collab")
const {MenuItem} = require("prosemirror-menu")
const crel = require("crel")

const {schema} = require("../schema")
const {GET, POST} = require("./http")
const {Reporter} = require("./reporter")

const report = new Reporter()

function badVersion(err) {
  return err.status == 400 && /invalid version/i.test(err)
}

class State {
  constructor(edit, comm) {
    this.edit = edit
    this.comm = comm
  }
}

class EditorConnection {
  constructor(report, url) {
    this.report = report
    this.url = url
    this.state = new State(null, "start")
    this.request = null
    this.backOff = 0
    this.view = null
    this.onAction = this.onAction.bind(this)
    this.start()
  }

  // All state changes go through this
  onAction(action) {
    if (action.type == "loaded") {
      info.users.textContent = userString(action.users) // FIXME ewww
      let editState = EditorState.create({
        doc: action.doc,
        plugins: [exampleSetup({schema, history: false}),
                  history.configure({preserveItems: true}),
                  collab({version: action.version})]
      })
      this.state = new State(editState, "poll")
      this.poll()
    } else if (action.type == "restart") {
      this.state = new State(null, "start")
      this.start()
    } else if (action.type == "poll") {
      this.state = new State(this.state.edit, "poll")
      this.poll()
    } else if (action.type == "recover") {
      if (action.error.status && action.error.status < 500) {
        this.report.failure(err)
        this.state = new State(null, null)
      } else {
        this.state = new State(this.state.edit, "recover")
        this.recover(action.error)
      }
    } else {
      let editState = this.state.edit.applyAction(action), sendable
      if (editState.doc.content.size > 40000) {
        if (this.state.comm != "detached") this.report.failure("Document too big. Detached.")
        this.state = new State(editState, "detached")
      } else if ((this.state.comm == "poll" || action.requestDone) && (sendable = sendableSteps(editState))) {
        this.closeRequest()
        this.state = new State(editState, "send")
        this.send(sendable)
      } else if (action.requestDone) {
        this.state = new State(editState, "poll")
        this.poll()
      } else {
        this.state = new State(editState, this.state.comm)
      }
    }

    // Sync the editor with this.state.edit
    if (this.state.edit) {
      if (this.view)
        this.view.updateState(this.state.edit)
      else
        this.view = new MenuBarEditorView(document.querySelector("#editor"),
                                          {state: this.state.edit, onAction: this.onAction})
    } else if (this.view) {
      document.querySelector("#editor").removeChild(this.view.wrapper)
      this.view = null
    }
  }

  // Load the document from the server and start up
  start() {
    this.run(GET(this.url)).then(data => {
      data = JSON.parse(data)
      this.report.success()
      this.backOff = 0
      this.onAction({type: "loaded",
                     doc: schema.nodeFromJSON(data.doc),
                     version: data.version,
                     users: data.users})
    }, err => {
      this.report.failure(err)
    })
  }

  // Send a request for events that have happened since the version
  // of the document that the client knows about. This request waits
  // for a new version of the document to be created if the client
  // is already up-to-date.
  poll() {
    this.run(GET(this.url + "/events?version=" + getVersion(this.state.edit))).then(data => {
      this.report.success()
      data = JSON.parse(data)
      this.backOff = 0
      if (data.steps && data.steps.length) {
        let action = receiveAction(this.state.edit, data.steps.map(j => Step.fromJSON(schema, j)), data.clientIDs)
        action.requestDone = true
        this.onAction(action)
      } else {
        this.poll()
      }
      info.users.textContent = userString(data.users)
    }, err => {
      if (err.status == 410 || badVersion(err)) {
        // Too far behind. Revert to server state
        report.failure(err)
        this.onAction({type: "restart"})
      } else if (err) {
        this.onAction({type: "recover", error: err})
      }
    })
  }

  // Send the given steps to the server
  send(sendable) {
    let json = JSON.stringify({version: sendable.version,
                               steps: sendable.steps.map(s => s.toJSON()),
                               clientID: sendable.clientID})
    this.run(POST(this.url + "/events", json, "application/json")).then(() => {
      this.report.success()
      this.backOff = 0
      let action = receiveAction(this.state.edit, sendable.steps, repeat(sendable.clientID, sendable.steps.length))
      action.requestDone = true
      this.onAction(action)
    }, err => {
      if (err.status == 409) {
        // The client's document conflicts with the server's version.
        // Poll for changes and then try again.
        this.backOff = 0
        this.onAction({type: "poll"})
      } else if (badVersion(err)) {
        this.report.failure(err)
        this.onAction({type: "restart"})
      } else {
        this.onAction({type: "recover", error: err})
      }
    })
  }

  // Try to recover from an error
  recover(err) {
    let newBackOff = this.backOff ? Math.min(this.backOff * 2, 6e4) : 200
    if (newBackOff > 1000 && this.backOff < 1000) this.report.delay(err)
    this.backOff = newBackOff
    setTimeout(() => {
      if (this.state.comm == "recover") this.onAction({type: "retry", requestDone: true})
    }, this.backOff)
  }

  closeRequest() {
    if (this.request) {
      this.request.abort()
      this.request = null
    }
  }

  run(request) {
    return this.request = request
  }

  close() {
    this.closeRequest()
    if (this.view) {
      document.querySelector("#editor").removeChild(this.view.wrapper)
      this.view = null
    }
  }
}

function repeat(val, n) {
  let result = []
  for (let i = 0; i < n; i++) result.push(val)
  return result
}

/*const annotationMenuItem = new MenuItem({
  title: "Add an annotation",
  run: addAnnotation,
  select: pm => addAnnotation(pm, false),
  icon: annotationIcon
})

let menu = buildMenuItems(schema)
menu.fullMenu[0].push(annotationMenuItem)*/

let info = {
  name: document.querySelector("#docname"),
  users: document.querySelector("#users")
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

let connection = null

function connectFromHash() {
  let isID = /^#edit-(.+)/.exec(location.hash)
  if (isID) {
    if (connection) connection.close()
    info.name.textContent = decodeURIComponent(isID[1])
    connection = window.connection = new EditorConnection(report, "/docs/" + isID[1])
    connection.request.then(() => connection.view.editor.focus())
    return true
  }
}

addEventListener("hashchange", connectFromHash)
connectFromHash() || (location.hash = "#edit-Example")
