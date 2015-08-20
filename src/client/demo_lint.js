import {ProseMirror} from "prosemirror/dist/edit"
import {Node, Span, Pos, getSpan} from "prosemirror/dist/model"
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
  delay = setTimeout(runLint, 1000)
})

let output = document.querySelector("#lint_output")
function runLint() {
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
        pm.setSelection(prob.from, prob.to)
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
  overlay = document.body.appendChild(elt("img", {src: "bouncing_arrow.gif", class: "probarrow"}))
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
  let result = [], lastHead = null, path = [], offset

  function record(msg, from, to, fix) {
    from = new Pos(path.slice(), from)
    to = to == null ? from : new Pos(from.path, to)
    result.push({msg, from, to, fix})
  }

  function scan(node) {
    if (node.type.name == "text") {
      let m
      while (m = badWords.exec(node.text))
        record("Try not to say '" + m[0] + "'", offset + m.index, offset + m.index + m[0].length)
      while (m = badPunc.exec(node.text))
        record("Suspicious spacing around punctuation", offset + m.index, offset + m.index + m[0].length, fixPunc(m))
    } else if (node.type.name == "heading") {
      if (lastHead != null && node.attrs.level > lastHead + 1)
        record("Heading too small (" + node.attrs.level + " under " + lastHead + ")", 0, node.maxOffset, fixHeader(lastHead + 1))
      lastHead = node.attrs.level
    } else if (node.type.name == "image") {
      if (!node.attrs.alt) record("Image without alt text", offset, offset + 1, addAlt)
    }

    if (node.type.block) {
      if (!node.content.length) record("Empty block", 0)
      offset = 0
      for (let i = 0; i < node.content.length; i++) {
        scan(node.content[i])
        offset += node.content[i].text.length
      }
    } else {
      for (let i = 0; i < node.content.length; i++) {
        path.push(i)
        scan(node.content[i])
        path.pop()
      }
    }
  }

  scan(doc)
  return result
}

function fixPunc(match) {
  return (pm, prob) => {
    pm.apply(pm.tr.delete(prob.from, prob.to)
                  .insertInline(prob.from, Span.text(match[1] + " ")))
  }
}

function fixHeader(level) {
  return (pm, prob) => pm.apply(pm.tr.setBlockType(prob.from, prob.to, new Node("heading", {level})))
}

function addAlt(pm, prob) {
  let alt = prompt("Alt text", "")
  if (!alt) return
  let img = getSpan(pm.doc, prob.to)
  pm.apply(pm.tr.delete(prob.from, prob.to).insertInline(prob.from, new Span("image", {
    src: img.attrs.src,
    alt: alt,
    title: img.attrs.title
  })))
}

runLint()
