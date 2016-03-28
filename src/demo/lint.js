import {ProseMirror} from "prosemirror/dist/edit"
import {elt} from "prosemirror/dist/dom"
import "prosemirror/dist/menu/menubar"

let pm = window.lintPM = new ProseMirror({
  place: document.querySelector("#editor"),
  doc: document.querySelector("#content").innerHTML,
  docFormat: "html",
  menuBar: true
})

let delay = null

pm.on("change", () => {
  clearTimeout(delay)
  delay = setTimeout(runLint, 500)
})

let output = document.querySelector("#lint_output")
function runLint() {
  if (showingProb) clearProb(showingProb)
  delay = null
  output.textContent = ""
  lint(pm.doc).forEach(prob => {
    let note = output.appendChild(elt("div", {class: "problem"}, prob.msg))
    if (prob.fix)
      note.appendChild(elt("button", {class: "fixbutton"}, "Fix")).addEventListener("click", () => {
        if (delay == null) {
          prob.fix(pm, prob)
          pm.focus()
        }
      })
    note.addEventListener("mouseover", event => {
      if (!note.contains(event.relatedTarget)) showProb(prob)
    })
    note.addEventListener("mouseout", event => {
      if (!note.contains(event.relatedTarget)) clearProb(prob)
    })
    note.addEventListener("click", () => {
      if (delay == null) {
        pm.setTextSelection(prob.from, prob.to)
        pm.focus()
      }
    })
  })
}

let showingProb = null, range = null, overlay = null
function showProb(prob) {
  if (showingProb) clearProb(showingProb)
  if (delay != null) return
  showingProb = prob
  if (prob.from.cmp(prob.to))
    range = pm.markRange(prob.from, prob.to, {className: "markprob"})
  overlay = document.body.appendChild(elt("img", {src: "/img/bouncing_arrow.gif", class: "probarrow"}))
  let coords = pm.coordsAtPos(prob.from)
  overlay.style.left = (coords.left - 55) + "px"
  overlay.style.top = (((coords.top + coords.bottom) / 2) - 16) + "px"
}
function clearProb(prob) {
  if (showingProb != prob) return
  if (range) pm.removeRange(range)
  document.body.removeChild(overlay)
  showingProb = range = overlay = null
}

let badWords = /obviously|clearly|evidently|actually/ig
let badPunc = / ([,\.!?:]) ?/g

function lint(doc) {
  let result = [], lastHead = null

  function record(msg, from, to, fix) {
    result.push({msg, from, to, fix})
  }

  function scan(node, pos) {
    if (node.isText) {
      let m
      while (m = badWords.exec(node.text))
        record("Try not to say '" + m[0] + "'", pos + m.index, pos + m.index + m[0].length)
      while (m = badPunc.exec(node.text))
        record("Suspicious spacing around punctuation", pos + m.index, pos + m.index + m[0].length, fixPunc(m))
    } else if (node.type.name == "heading") {
      if (lastHead != null && node.attrs.level > lastHead + 1)
        record("Heading too small (" + node.attrs.level + " under " + lastHead + ")", pos + 1, pos + 1 + node.content.size, fixHeader(lastHead + 1))
      lastHead = node.attrs.level
    } else if (node.type.name == "image") {
      if (!node.attrs.alt) record("Image without alt text", pos, pos + 1, addAlt)
    }

    if (node.isTextblock && !node.size) record("Empty block", pos + 1, pos + 1)

    node.forEach((child, offset) => scan(child, node + 1 + offset))
  }

  scan(doc, 0)
  return result
}

function fixPunc(match) {
  return (pm, prob) => {
    pm.tr.delete(prob.from, prob.to)
         .insert(prob.from, pm.schema.text(match[1] + " "))
         .apply()
  }
}

function fixHeader(level) {
  return (pm, prob) => pm.tr.setBlockType(prob.from, prob.to, pm.schema.nodeType("heading"), {level}).apply()
}

function addAlt(pm, prob) {
  let alt = prompt("Alt text", "")
  if (!alt) return
  let img = pm.doc.nodeAfter(prob.from)
  pm.tr.delete(prob.from, prob.to)
       .insert(prob.from, img.type.create({
         src: img.attrs.src,
         alt: alt,
         title: img.attrs.title
       }, null, img.marks))
       .apply()
}

runLint()
