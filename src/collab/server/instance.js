const {readFileSync, writeFile} = require("fs")

const {Mapping} = require("prosemirror-transform")

const {schema} = require("../schema")
const {Comments, Comment} = require("./comments")
const {populateDefaultInstances} = require("./defaultinstances")

const MAX_STEP_HISTORY = 10000

// A collaborative editing document instance.
class Instance {
  constructor(id, doc, comments) {
    this.id = id
    this.doc = doc || schema.node("doc", null, [schema.node("paragraph", null, [
      schema.text("This is a collaborative test document. Start editing to make it more interesting!")
    ])])
    this.comments = comments || new Comments
    // The version number of the document instance.
    this.version = 0
    this.steps = []
    this.lastActive = Date.now()
    this.users = Object.create(null)
    this.userCount = 0
    this.waiting = []

    this.collecting = null
  }

  stop() {
    if (this.collecting != null) clearInterval(this.collecting)
  }

  addEvents(version, steps, comments, clientID) {
    this.checkVersion(version)
    if (this.version != version) return false
    let doc = this.doc, maps = []
    for (let i = 0; i < steps.length; i++) {
      steps[i].clientID = clientID
      let result = steps[i].apply(doc)
      doc = result.doc
      maps.push(steps[i].getMap())
    }
    this.doc = doc
    this.version += steps.length
    this.steps = this.steps.concat(steps)
    if (this.steps.length > MAX_STEP_HISTORY)
      this.steps = this.steps.slice(this.steps.length - MAX_STEP_HISTORY)

    this.comments.mapThrough(new Mapping(maps))
    if (comments) for (let i = 0; i < comments.length; i++) {
      let event = comments[i]
      if (event.type == "delete")
        this.comments.deleted(event.id)
      else
        this.comments.created(event)
    }

    while (this.waiting.length) this.waiting.pop().finish()
    scheduleSave()
    return {version: this.version, commentVersion: this.comments.version}
  }

  // : (Number)
  // Check if a document version number relates to an existing
  // document version.
  checkVersion(version) {
    if (version < 0 || version > this.version) {
      let err = new Error("Invalid version " + version)
      err.status = 400
      throw err
    }
  }

  // : (Number, Number)
  // Get events between a given document version and
  // the current document version.
  getEvents(version, commentVersion) {
    this.checkVersion(version)
    let startIndex = this.steps.length - (this.version - version)
    if (startIndex < 0) return false
    let commentStartIndex = this.comments.events.length - (this.comments.version - commentVersion)
    if (commentStartIndex < 0) return false

    return {steps: this.steps.slice(startIndex),
            comment: this.comments.eventsAfter(commentStartIndex),
            users: this.userCount}
  }

  collectUsers() {
    this.users = Object.create(null)
    this.userCount = 0
    this.collecting = null
    for (let i = 0; i < this.waiting.length; i++)
      this.registerUser(this.waiting[i].ip)
  }

  registerUser(ip) {
    if (!(ip in this.users)) {
      this.users[ip] = true
      this.userCount++
      if (this.collecting == null)
        this.collecting = setTimeout(() => this.collectUsers(), 5000)
    }
  }
}

const instances = Object.create(null)
let instanceCount = 0
let maxCount = 20

let saveFile = __dirname + "/../demo-instances.json", json
if (process.argv.indexOf("--fresh") == -1) {
  try {
    json = JSON.parse(readFileSync(saveFile, "utf8"))
  } catch (e) {}
}

if (json) {
  for (let prop in json)
    newInstance(prop, schema.nodeFromJSON(json[prop].doc),
                new Comments(json[prop].comments.map(c => Comment.fromJSON(c))))
} else {
  populateDefaultInstances(newInstance)
}

let saveTimeout = null, saveEvery = 1e4
function scheduleSave() {
  if (saveTimeout != null) return
  saveTimeout = setTimeout(doSave, saveEvery)
}
function doSave() {
  saveTimeout = null
  let out = {}
  for (var prop in instances)
    out[prop] = {doc: instances[prop].doc.toJSON(),
                 comments: instances[prop].comments.comments}
  writeFile(saveFile, JSON.stringify(out))
}

function getInstance(id, ip) {
  let inst = instances[id] || newInstance(id)
  if (ip) inst.registerUser(ip)
  inst.lastActive = Date.now()
  return inst
}
exports.getInstance = getInstance

function newInstance(id, doc, comments) {
  if (++instanceCount > maxCount) {
    let oldest = null
    for (let id in instances) {
      let inst = instances[id]
      if (!oldest || inst.lastActive < oldest.lastActive) oldest = inst
    }
    instances[oldest.id].stop()
    delete instances[oldest.id]
    --instanceCount
  }
  return instances[id] = new Instance(id, doc, comments)
}

function instanceInfo() {
  let found = []
  for (let id in instances)
    found.push({id: id, users: instances[id].userCount})
  return found
}
exports.instanceInfo = instanceInfo
