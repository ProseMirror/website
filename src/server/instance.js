import {Node} from "prosemirror/dist/model"
import {applyStep} from "prosemirror/dist/transform"

class Instance {
  constructor(id) {
    this.id = id
    this.doc = new Node("doc", null, [new Node("paragraph")])
    this.version = 0
    this.steps = []
    this.lastActive = Date.now()
    this.waiting = []
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

export function addSteps(id, version, steps) {
  let inst = getInstance(id)
  if (version < 0 || version > inst.version) throw new Error("Bogus version " + version)
  if (inst.version != version) return false
  let doc = inst.doc
  for (let i = 0; i < steps.length; i++)
    doc = applyStep(doc, steps[i]).doc
  inst.doc = doc
  inst.version += steps.length
  inst.steps = inst.steps.concat(steps)
  inst.lastActive = Date.now()
  while (inst.waiting.length) inst.waiting.pop()()
  return true
}

export function getSteps(id, version) {
  let inst = getInstance(id)
  if (version < 0 || version > inst.version) throw new Error("Bogus version " + version)
  let startIndex = inst.steps.length - (inst.version - version)
  if (startIndex < 0) return false
  inst.lastActive = Date.now()
  return inst.steps.slice(startIndex)
}
