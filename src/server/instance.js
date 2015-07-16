import {Node, Span} from "prosemirror/dist/model"
import {applyStep} from "prosemirror/dist/transform"

import {Comments} from "./comments"

class Instance {
  constructor(id, doc) {
    this.id = id
    this.doc = doc || new Node("doc", null, [new Node("paragraph", null, [
      Span.text("This is a collaborative test document. Start editing to make it more interesting!")
    ])])
    this.comments = new Comments
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

  addEvents(version, steps, comments) {
    this.checkVersion(version)
    if (this.version != version) return false
    let doc = this.doc, maps = []
    for (let i = 0; i < steps.length; i++) {
      let result = applyStep(doc, steps[i])
      if (!result) console.log("doc: " + doc, steps[i])
      doc = result.doc
      maps.push(result.map)
    }
    this.doc = doc
    this.version += steps.length
    this.steps = this.steps.concat(steps)

    this.comments.mapThrough(maps)
    for (let i = 0; i < comments.length; i++) {
      let event = comments[i]
      if (event.type == "delete")
        this.comments.deleted(event.id)
      else
        this.comments.created(event)
    }

    while (this.waiting.length) this.waiting.pop().finish()
    return {version: this.version, commentVersion: this.comments.version}
  }

  checkVersion(version) {
    if (version < 0 || version > this.version) {
      let err = new Error("Invalid version " + version)
      err.status = 400
      throw err
    }
  }

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

export function getInstance(id, ip) {
  let inst = instances[id] || newInstance(id)
  if (ip) inst.registerUser(ip)
  inst.lastActive = Date.now()
  return inst
}

export function newInstance(id, doc) {
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
  return instances[id] = new Instance(id, doc)
}

export function instanceInfo() {
  let found = []
  for (let id in instances)
    found.push({id: id, users: instances[id].userCount})
  return found
}
