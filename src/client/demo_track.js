import {ProseMirror, Range} from "prosemirror/dist/edit"
import {Pos} from "prosemirror/dist/model"
import {mapStep, Remapping, Transform} from "prosemirror/dist/transform"
import {elt} from "prosemirror/dist/dom"
import "prosemirror/dist/menu/menubar"

let pm = window.pm = new ProseMirror({
  place: document.querySelector("#editor"),
  menuBar: {float: true}
})

class Commit {
  constructor() {
    this.message = this.time = null
    this.hidden = false
    this.steps = []
    this.maps = []
  }
  finish(message) {
    this.message = message
    this.time = new Date
    return this
  }
}

let commits = window.commits = []
let uncommitted = new Commit
let blameMap = [{from: new Pos([], 0), to: new Pos([], 1), commit: null}]

pm.on("transform", transform => {
  let inverted = transform.steps.map((step, i) => step.invert(transform.docs[i], transform.maps[i]))
  uncommitted.steps = uncommitted.steps.concat(inverted)
  uncommitted.maps = uncommitted.maps.concat(transform.maps)

  adjustBlameMap(transform.steps, transform.maps, uncommitted)
  setDisabled()
})

pm.tr.typeText("Type something, and then commit it.").apply()
uncommitted.hidden = true
doCommit("Initial content")

function setDisabled() {
  let input = document.querySelector("#message")
  let button = document.querySelector("#commitbutton")
  input.disabled = button.disabled = uncommitted.steps == 0
}
setDisabled()

function doCommit(message) {
  if (uncommitted.steps.length == 0) return
  commits.push(uncommitted.finish(message))
  uncommitted = new Commit
  renderCommits()
  setDisabled()
}

function adjustBlameMap(steps, maps, commit) {
  for (let i = 0; i < maps.length; i++) {
    let map = maps[i]
    for (let j = 0; j < blameMap.length; j++) {
      let span = blameMap[j]
      span.from = map.map(span.from, 1).pos
      span.to = map.map(span.to, -1).pos
      if (!span.from.cmp(span.to)) blameMap.splice(j--, 1)
    }
    let step = steps[i], to
    if (step.name == "replace" && (to = map.map(step.to, 1).pos) && step.from.cmp(to)) {
      let pos = 0, span = {from: step.from, to, commit}
      while (pos < blameMap.length && blameMap[pos].to.cmp(step.from) <= 0) ++pos
      let after = blameMap[pos]
      if (after && after.from.cmp(span.to) < 0) {
        blameMap.splice(pos, 1, {from: after.from, to: span.from, commit: after.commit},
                        span, {from: span.to, to: after.to, commit: after.commit})
      } else {
        blameMap.splice(pos, 0, span)
      }
    }
  }
  for (let i = 0; i < blameMap.length - 1; i++) {
    let span = blameMap[i]
    if (span.commit == blameMap[i + 1].commit) {
      span.to = blameMap[i + 1].to
      blameMap.splice(i + 1, 1)
    }
  }
}

function findInBlameMap(pos) {
  for (let i = 0; i < blameMap.length; i++)
    if (blameMap[i].to.cmp(pos) >= 0 && blameMap[i].commit) return blameMap[i].commit
}

function renderCommits() {
  let out = document.querySelector("#commits")
  out.textContent = ""
  commits.filter(c => !c.hidden).forEach(commit => {
    let node = elt("div", {class: "commit"},
                   elt("span", {class: "commit-time"},
                       commit.time.getHours() + ":" + (commit.time.getMinutes() < 10 ? "0" : "")
                       + commit.time.getMinutes()),
                   "\u00a0 " + commit.message + "\u00a0 ",
                   elt("button", {class: "commit-revert"}, "revert"))
    node.lastChild.addEventListener("click", () => revertCommit(commit))
    node.addEventListener("mouseover", e => {
      if (!node.contains(e.relatedTarget)) highlightCommit(commit)
    })
    node.addEventListener("mouseout", e => {
      if (!node.contains(e.relatedTarget)) clearHighlight(commit)
    })
    out.appendChild(node)
  })
}

let highlighted = null

function highlightCommit(commit) {
  if (highlighted && highlighted.commit == commit) return
  if (highlighted) clearHighlight(highlighted.commit)
  highlighted = {
    ranges: blameMap.filter(span => span.commit == commit)
                    .map(span => pm.markRange(span.from, span.to, {className: "commit-blame"})),
    commit: commit
  }
}
function clearHighlight(commit) {
  if (highlighted && highlighted.commit == commit) {
    for (let i = 0; i < highlighted.ranges.length; i++)
      pm.removeRange(highlighted.ranges[i])
    highlighted = null
  }
}

function revertCommit(commit) {
  let found = commits.indexOf(commit)
  if (found == -1) return

  if (uncommitted.steps.length) return alert("Commit your changes first!")

  let remap = new Remapping([], commits.slice(found + 1).reduce((maps, c) => maps.concat(c.maps), []))
  let tr = pm.tr
  for (let i = commit.steps.length - 1; i >= 0; i--) {
    let remapped = mapStep(commit.steps[i], remap)
    let result = remapped && tr.step(remapped)
    let id = remap.addToFront(commit.maps[i])
    if (result) remap.addToBack(result.map, id)
  }
  commit.hidden = true
  if (tr.steps.length) {
    tr.apply()
    uncommitted.hidden = true
    doCommit("Revert “" + commit.message + "”")
  } else {
    renderCommits()
  }
}
  
document.querySelector("#commit").addEventListener("submit", e => {
  e.preventDefault()
  doCommit(e.target.elements.message.value || "Unnamed")
  e.target.elements.message.value = ""
  pm.focus()
})

document.querySelector("#blame").addEventListener("mousedown", e => {
  e.preventDefault()
  let pos = e.target.getBoundingClientRect()
  let commit = findInBlameMap(pm.selection.head)
  let node = elt("div", {class: "blame-info"},
                 commit ? ["It was: ", elt("strong", null, commit.message || "Uncommitted")]
                        : "No commit found")
  node.style.right = (document.body.clientWidth - pos.right) + "px"
  node.style.top = (pos.bottom + 2) + "px"
  document.body.appendChild(node)
  setTimeout(() => document.body.removeChild(node), 2000)
})
