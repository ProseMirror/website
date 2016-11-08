const {EditorState, Plugin, TextSelection} = require("prosemirror-state")
const {Decoration, DecorationSet} = require("prosemirror-view")
const {MenuBarEditorView} = require("prosemirror-menu")
const {DOMParser} = require("prosemirror-model")
const {schema} = require("prosemirror-schema-basic")
const {exampleSetup} = require("prosemirror-example-setup")
const crel = require("crel")

let delay = null

let showProbPlugin = new Plugin({
  state: {
    init: () => ({prob: null, deco: DecorationSet.empty}),
    applyAction: (action, prev, state) => {
      switch (action.type) {
      case "transform":
        return {prob: prev.prob, deco: prev.deco.map(action.transform.mapping, action.transform.doc)}
      case "showProb":
        return {prob: action.prob, deco: action.prob ? decoForProb(state.doc, action.prob) : DecorationSet.empty}
      default:
        return prev
      }
    }
  },

  props: {
    decorations(state) {
      return this.getState(state).deco
    }
  }
})

function decoForProb(doc, prob) {
  let decos = [Decoration.widget(prob.from, crel("span", {class: "probarrow"}, crel("img", {src: "/img/bouncing_arrow.gif"})))]
  if (prob.from != prob.to)
    decos.push(Decoration.inline(prob.from, prob.to, {class: "markprob"}))
  return DecorationSet.create(doc, decos)
}

let view = new MenuBarEditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(schema).parse(document.querySelector("#content")),
    plugins: exampleSetup({schema}).concat(showProbPlugin)
  }),
  onAction: action => {
    view.updateState(view.editor.state.applyAction(action))
    if (action.type == "transform") {
      clearTimeout(delay)
      delay = setTimeout(() => runLint(view.editor), 500)
    }
  }
})

let output = document.querySelector("#lint_output")

function runLint(view) {
  clearProb(view)
  delay = null
  output.textContent = ""
  lint(view.state.doc).forEach(prob => {
    let note = output.appendChild(crel("div", {class: "problem"}, prob.msg))
    if (prob.fix)
      note.appendChild(crel("button", {class: "fixbutton"}, "Fix")).addEventListener("click", () => {
        if (delay == null) {
          prob.fix(prob, view.state, view.props.onAction)
          view.focus()
        }
      })
    note.addEventListener("mouseover", event => {
      if (!note.contains(event.relatedTarget)) showProb(view, prob)
    })
    note.addEventListener("mouseout", event => {
      if (!note.contains(event.relatedTarget)) clearProb(view, prob)
    })
    note.addEventListener("click", () => {
      if (delay == null) {
        let doc = view.state.doc
        view.props.onAction(TextSelection.create(doc, prob.from, prob.to).action({scrollIntoView: true}))
        view.focus()
      }
    })
  })
}

function showProb(view, prob) {
  view.props.onAction({type: "showProb", prob})
}
function clearProb(view, prob) {
  let cur = showProbPlugin.getState(view.state).prob
  if (prob ? cur == prob : cur)
    view.props.onAction({type: "showProb", prob: null})
}

let badWords = /obviously|clearly|evidently|actually/ig
let badPunc = / ([,\.!?:]) ?/g

function lint(doc) {
  let result = [], lastHead = null

  function record(msg, from, to, fix) {
    result.push({msg, from, to, fix})
  }

  function scanFragment(frag, pos) {
    frag.forEach((child, offset) => scan(child, pos + offset))
  }

  function scan(node, pos) {
    if (node.isText) {
      let m
      while (m = badWords.exec(node.text))
        record("Try not to say '" + m[0] + "'", pos + m.index, pos + m.index + m[0].length)
      while (m = badPunc.exec(node.text))
        record("Suspicious spacing around punctuation", pos + m.index, pos + m.index + m[0].length, fixPunc(m))
    } else if (node.type.name == "heading") {
      let level = +node.attrs.level
      if (lastHead != null && level > lastHead + 1)
        record("Heading too small (" + level + " under " + lastHead + ")",
               pos + 1, pos + 1 + node.content.size,
               fixHeader(lastHead + 1))
      lastHead = level
    } else if (node.type.name == "image") {
      if (!node.attrs.alt) record("Image without alt text", pos, pos + 1, addAlt)
    }

    if (node.isTextblock && !node.content.size) record("Empty block", pos, pos)

    scanFragment(node.content, pos + 1)
  }

  scanFragment(doc.content, 0)
  return result
}

function fixPunc(match) {
  return (prob, state, onAction) => {
    onAction(state.tr.delete(prob.from, prob.to)
             .insert(prob.from, state.schema.text(match[1] + " "))
             .action())
  }
}

function fixHeader(level) {
  return (prob, state, onAction) => {
    onAction(state.tr.setBlockType(prob.from, prob.to, state.schema.nodeType("heading"), {level}).action())
  }
}

function addAlt(prob, state, onAction) {
  let alt = prompt("Alt text", "")
  let img = state.doc.nodeAt(prob.from)
  if (alt) onAction(state.tr.setNodeType(prob.from, null, {
    src: img.attrs.src,
    alt: alt,
    title: img.attrs.title
  }).action())
}

runLint(view.editor)
