import {Node} from "prosemirror/dist/model"
import {applyStep} from "prosemirror/dist/transform"

import {Comments} from "./comments"

class Instance {
  constructor(id) {
    this.id = id
    this.doc = new Node("doc", null, [new Node("paragraph")])
    this.comments = new Comments
    this.version = 0
    this.steps = []
    this.lastActive = Date.now()
    this.waiting = []
  }

  addEvents(version, steps, comments) {
    this.checkVersion(version)
    if (this.version != version) return false
    let doc = this.doc, maps = []
    for (let i = 0; i < steps.length; i++) {
      let result = applyStep(doc, steps[i])
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

    this.lastActive = Date.now()
    while (this.waiting.length) this.waiting.pop()()
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

    this.lastActive = Date.now()
    return {steps: this.steps.slice(startIndex),
            comment: this.comments.eventsAfter(commentStartIndex)}
  }
}

const instances = Object.create(null)
let instanceCount = 0
let maxCount = 500

export function getInstance(id) {
  return instances[id] || newInstance(id)
}

function newInstance(id) {
  if (++instanceCount > maxCount) {
    let oldest = null
    for (let id in instances) {
      let inst = instances[id]
      if (!oldest || inst.lastActive < oldest.lastActive) oldest = inst
    }
    delete instances[oldest.id]
  }
  return instances[id] = new Instance(id)
}

export function instanceIDs() {
  return Object.keys(instances)
}
