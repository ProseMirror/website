import {ProseMirror, defineOption, Keymap} from "prosemirror/dist/edit"
import {nodeTypes, NodeType, Span, Pos} from "prosemirror/dist/model"
import {fromMarkdown} from "prosemirror/dist/convert/from_markdown"
import {render as renderDOM} from "prosemirror/dist/convert/to_dom"
import {tags as parseTags} from "prosemirror/dist/convert/from_dom"
import {registerItem, MenuItem} from "prosemirror/dist/menu/items"
import {elt} from "prosemirror/dist/dom"
import {addInputRules, Rule} from "prosemirror/dist/inputrules/inputrules"
import {Tooltip} from "prosemirror/dist/menu/tooltip"
import "prosemirror/dist/convert/to_markdown"
import "prosemirror/dist/menu/inlinemenu"
import "prosemirror/dist/menu/buttonmenu"
import "prosemirror/dist/menu/menubar"
import "prosemirror/dist/inputrules/autoinput"

function initMarkdownView() {
  let place = document.querySelector("#markdown_editor")

  let state = "textarea", getContent
  function toTextArea(content) {
    let te = place.appendChild(elt("textarea", {style: "font-family: inherit; font-size: inherit"}))
    te.value = content
    te.focus()
    getContent = () => te.value
  }
  function toProseMirror(content) {
    let pm = new ProseMirror({
      place: place,
      doc: fromMarkdown(content),
      inlineMenu: true,
      buttonMenu: true
    })
    pm.focus()
    getContent = () => pm.getContent("markdown")
  }
  toTextArea(document.querySelector("#markdown_content").textContent)

  function change() {
    let content = getContent()
    place.textContent = ""
    if (document.querySelector("#inputformat").checked) toTextArea(content)
    else toProseMirror(content)
  }
  let radios = document.querySelectorAll("[name=inputformat]")
  for (let i = 0; i < radios.length; i++) radios[i].addEventListener("change", change)
}

function initWidgetEditor() {
  const dinos = ["brontosaurus", "stegosaurus", "triceratops", "tyrannosaurus", "pterodactyl"]

  nodeTypes.dino = new NodeType({name: "dino", type: "span", defaultAttrs: {type: "brontosaurus"}})
  renderDOM.dino = node => elt("img", {"dino-type": node.attrs.type,
                                       class: "dinosaur",
                                       src: "dino/" + node.attrs.type + ".png",
                                       title: node.attrs.type})
  let oldImg = parseTags.img
  parseTags.img = (dom, context) => {
    if (dom.className == "dinosaur") context.insert(new Span("dino", {type: dom.getAttribute("dino-type")}))
    else return oldImg(dom, context)
  }

  class DinoItem extends MenuItem {
    constructor(image, action) {
      super()
      this.image = image
      this.action = action
    }
    select(pm) { return pm.getOption("dinos") }
    render(menu) {
      let button = elt("img", {src: "dino/" + this.image + ".png", class: "dinoicon", title: "Insert dinosaur"})
      button.addEventListener("mousedown", e => {
        e.preventDefault(); e.stopPropagation()
        menu.run(this.action(menu.pm))
      })
      return button
    }
  }
  let dinoItems = dinos.map(name => new DinoItem(name, pm => insertDino(pm, name)))
  registerItem("inline", new DinoItem("brontosaurus", () => dinoItems))

  function insertDino(pm, name) {
    pm.apply(pm.tr.insertInline(pm.selection.head, new Span("dino", {type: name})))
  }

  defineOption("dinos", false)
  let pm = window.dinoPM = new ProseMirror({
    place: document.querySelector("#widget_editor"),
    menuBar: true,
    doc: document.querySelector("#widget_content").innerHTML,
    docFormat: "html",
    dinos: true,
    autoInput: true
  })
  addInputRules(pm, dinos.map(name => new Rule("]", new RegExp("\\[" + name + "\\]"), (pm, _, pos) => {
    let start = pos.shift(-(name.length + 2))
    pm.apply(pm.tr.delete(start, pos).insertInline(start, new Span("dino", {type: name})))
  })))

  let tooltip = new Tooltip(pm, "below"), open
  pm.content.addEventListener("keydown", () => { tooltip.close(); open = null })
  pm.content.addEventListener("mousedown", () => { tooltip.close(); open = null })
  pm.on("textInput", text => {
    if (!/[\[\w]/.test(text)) return
    let pos = pm.selection.head
    let line = pm.doc.path(pos.path).textContent
    let bracket = line.lastIndexOf("[", pos.offset)
    if (bracket == -1) return
    let word = line.slice(bracket + 1, pos.offset)
    let completions = dinos.filter(name => name.indexOf(word) == 0)
    if (completions.length) showCompletions(completions, pos.shift(-(word.length + 1)), pos)
  })

  function showCompletions(dinos, from, to) {
    function applyCompletion(name) {
      pm.apply(pm.tr.delete(from, to).insertInline(from, new Span("dino", {type: name})))
      tooltip.close()
    }
    let items = dinos.map(name => {
      let icon = elt("img", {src: "dino/" + name + ".png", class: "dinoicon", title: name})
      let item = elt("div", {style: "cursor: pointer"}, icon, " " + name)
      item.addEventListener("mousedown", e => {
        e.preventDefault()
        applyCompletion(name)
      })
      return item
    })
    let coords = pm.coordsAtPos(from)
    tooltip.open(elt("div", null, items), {left: coords.left, top: coords.bottom})
    open = () => applyCompletion(dinos[0])
  }

  pm.addKeymap(new Keymap({
    Tab: pm => {
      if (open) open()
      else return false
    }
  }))
}

function initLintEditor() {
  let badWords = /obviously|clearly|evidently|actually/ig
  function lint(doc) {
    let result = [], lastHead = null, path = [], offset
    function record(msg, from, to) {
      from = new Pos(path.slice(), from)
      to = to == null ? from : new Pos(from.path, to)
      result.push({msg: msg, from: from, to: to})
    }
    function scan(node) {
      if (node.type.name == "text") {
        let m
        while (m = badWords.exec(node.text))
          record("Try not to say '" + m[0] + "'", offset + m.index, offset + m.index + m[0].length)
      } else if (node.type.name == "heading") {
        if (lastHead != null && node.attrs.level > lastHead + 1)
          record("Heading too small (" + node.attrs.level + " under " + lastHead + ")", 0, node.maxOffset)
        lastHead = node.attrs.level
      } else if (node.type.name == "image") {
        if (!node.attrs.alt) record("Missing alt text", offset, offset + 1)
      }

      if (node.type.block) {
        if (!node.content.length) record("Empty block", new Pos(path, 0))
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

  let pm = window.lintPM = new ProseMirror({
    place: document.querySelector("#lint_editor"),
    doc: document.querySelector("#lint_content").innerHTML,
    docFormat: "html",
    menuBar: true
  }), delay = null
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

  runLint()
}

initMarkdownView()
initWidgetEditor()
initLintEditor()
