class Span {
  constructor(from, to, commit) {
    this.from = from; this.to = to; this.commit = commit
  }
}

class Commit {
  constructor(message, time, steps, maps, hidden) {
    this.message = message
    this.time = time
    this.steps = steps
    this.maps = maps
    this.hidden = hidden
  }
}

// TrackState{
class TrackState {
  constructor(blameMap, commits, uncommittedSteps, uncommittedMaps) {
    // The blame map is a data structure that lists a sequence of
    // document ranges, along with the commit that inserted them. This
    // can be used to, for example, highlight the part of the document
    // that was inserted by a commit.
    this.blameMap = blameMap
    // The commit history, as an array of objects.
    this.commits = commits
    // Inverted steps and their maps corresponding to the changes that
    // have been made since the last commit.
    this.uncommittedSteps = uncommittedSteps
    this.uncommittedMaps = uncommittedMaps
  }

  // Apply a transform to this state
  applyTransform(transform) {
    // Invert the steps in the transaction, to be able to save them in
    // the next commit
    let inverted =
      transform.steps.map((step, i) => step.invert(transform.docs[i]))
    let newBlame = updateBlameMap(this.blameMap, transform, this.commits.length)
    // Create a new state—since these are part of the editor state, a
    // persistent data structure, they must not be mutated.
    return new TrackState(newBlame, this.commits,
                          this.uncommittedSteps.concat(inverted),
                          this.uncommittedMaps.concat(transform.mapping.maps))
  }

  // When a transaction is marked as a commit, this is used to put any
  // uncommitted steps into a new commit.
  applyCommit(message, time) {
    if (this.uncommittedSteps.length == 0) return this
    let commit = new Commit(message, time, this.uncommittedSteps,
                            this.uncommittedMaps)
    return new TrackState(this.blameMap, this.commits.concat(commit), [], [])
  }
}
// }

function updateBlameMap(map, transform, id) {
  let result = [], mapping = transform.mapping
  for (let i = 0; i < map.length; i++) {
    let span = map[i]
    let from = mapping.map(span.from, 1), to = mapping.map(span.to, -1)
    if (from < to) result.push(new Span(from, to, span.commit))
  }

  for (let i = 0; i < mapping.maps.length; i++) {
    let map = mapping.maps[i], after = mapping.slice(i + 1)
    map.forEach((_s, _e, start, end) => {
      insertIntoBlameMap(result, after.map(start, 1), after.map(end, -1), id)
    })
  }

  return result
}

function insertIntoBlameMap(map, from, to, commit) {
  if (from >= to) return
  let pos = 0, next
  for (; pos < map.length; pos++) {
    next = map[pos]
    if (next.commit == commit) {
      if (next.to >= from) break
    } else if (next.to > from) { // Different commit, not before
      if (next.from < from) { // Sticks out to the left (loop below will handle right side)
        let left = new Span(next.from, from, next.commit)
        if (next.to > to) map.splice(pos++, 0, left)
        else map[pos++] = left
      }
      break
    }
  }

  while (next = map[pos]) {
    if (next.commit == commit) {
      if (next.from > to) break
      from = Math.min(from, next.from)
      to = Math.max(to, next.to)
      map.splice(pos, 1)
    } else {
      if (next.from >= to) break
      if (next.to > to) {
        map[pos] = new Span(to, next.to, next.commit)
        break
      } else {
        map.splice(pos, 1)
      }
    }
  }

  map.splice(pos, 0, new Span(from, to, commit))
}

// trackPlugin{
import {Plugin} from "prosemirror-state"

const trackPlugin = new Plugin({
  state: {
    init(_, instance) {
      return new TrackState([new Span(0, instance.doc.content.size, null)], [], [], [])
    },
    apply(tr, tracked) {
      if (tr.docChanged) tracked = tracked.applyTransform(tr)
      let commitMessage = tr.getMeta(this)
      if (commitMessage) tracked = tracked.applyCommit(commitMessage, new Date(tr.time))
      return tracked
    }
  }
})
// }

import {EditorState} from "prosemirror-state"
import {Decoration, DecorationSet, EditorView} from "prosemirror-view"
import {schema} from "prosemirror-schema-basic"
import {exampleSetup} from "prosemirror-example-setup"

function elt(name, attrs, ...children) {
  let dom = document.createElement(name)
  if (attrs) for (let attr in attrs) dom.setAttribute(attr, attrs[attr])
  for (let i = 0; i < children.length; i++) {
    let child = children[i]
    dom.appendChild(typeof child == "string" ? document.createTextNode(child) : child)
  }
  return dom
}

const highlightPlugin = new Plugin({
  state: {
    init() { return {deco: DecorationSet.empty, commit: null} },
    apply(tr, prev, oldState, state) {
      let highlight = tr.getMeta(this)
      if (highlight && highlight.add != null && prev.commit != highlight.add) {
        let tState = trackPlugin.getState(oldState)
        let decos = tState.blameMap
            .filter(span => tState.commits[span.commit] == highlight.add)
            .map(span => Decoration.inline(span.from, span.to, {class: "blame-marker"}))
        return {deco: DecorationSet.create(state.doc, decos), commit: highlight.add}
      } else if (highlight && highlight.clear != null && prev.commit == highlight.clear) {
        return {deco: DecorationSet.empty, commit: null}
      } else if (tr.docChanged && prev.commit) {
        return {deco: prev.deco.map(tr.mapping, tr.doc), commit: prev.commit}
      } else {
        return prev
      }
    }
  },
  props: {
    decorations(state) { return this.getState(state).deco }
  }
})

let state = EditorState.create({
  schema,
  plugins: exampleSetup({schema}).concat(trackPlugin, highlightPlugin)
}), view

let lastRendered = null

function dispatch(tr) {
  state = state.apply(tr)
  view.updateState(state)
  setDisabled(state)
  renderCommits(state, dispatch)
}

view = window.view = new EditorView(document.querySelector("#editor"), {state, dispatchTransaction: dispatch})

dispatch(state.tr.insertText("Type something, and then commit it."))
dispatch(state.tr.setMeta(trackPlugin, "Initial commit"))

function setDisabled(state) {
  let input = document.querySelector("#message")
  let button = document.querySelector("#commitbutton")
  input.disabled = button.disabled = trackPlugin.getState(state).uncommittedSteps.length == 0
}

function doCommit(message) {
  dispatch(state.tr.setMeta(trackPlugin, message))
}

function renderCommits(state, dispatch) {
  let curState = trackPlugin.getState(state)
  if (lastRendered == curState) return
  lastRendered = curState

  let out = document.querySelector("#commits")
  out.textContent = ""
  let commits = curState.commits
  commits.forEach(commit => {
    let node = elt("div", {class: "commit"},
                   elt("span", {class: "commit-time"},
                       commit.time.getHours() + ":" + (commit.time.getMinutes() < 10 ? "0" : "")
                       + commit.time.getMinutes()),
                   "\u00a0 " + commit.message + "\u00a0 ",
                   elt("button", {class: "commit-revert"}, "revert"))
    node.lastChild.addEventListener("click", () => revertCommit(commit))
    node.addEventListener("mouseover", e => {
      if (!node.contains(e.relatedTarget))
        dispatch(state.tr.setMeta(highlightPlugin, {add: commit}))
    })
    node.addEventListener("mouseout", e => {
      if (!node.contains(e.relatedTarget))
        dispatch(state.tr.setMeta(highlightPlugin, {clear: commit}))
    })
    out.appendChild(node)
  })
}

// revertCommit{
import {Mapping} from "prosemirror-transform"

function revertCommit(commit) {
  let trackState = trackPlugin.getState(state)
  let index = trackState.commits.indexOf(commit)
  // If this commit is not in the history, we can't revert it
  if (index == -1) return

  // Reverting is only possible if there are no uncommitted changes
  if (trackState.uncommittedSteps.length)
    return alert("Commit your changes first!")

  // This is the mapping from the document as it was at the start of
  // the commit to the current document.
  let remap = new Mapping(trackState.commits.slice(index)
                          .reduce((maps, c) => maps.concat(c.maps), []))
  let tr = state.tr
  // Build up a transaction that includes all (inverted) steps in this
  // commit, rebased to the current document. They have to be applied
  // in reverse order.
  for (let i = commit.steps.length - 1; i >= 0; i--) {
    // The mapping is sliced to not include maps for this step and the
    // ones before it.
    let remapped = commit.steps[i].map(remap.slice(i + 1))
    if (!remapped) continue
    let result = tr.maybeStep(remapped)
    // If the step can be applied, add its map to our mapping
    // pipeline, so that subsequent steps are mapped over it.
    if (result.doc) remap.appendMap(remapped.getMap(), i)
  }
  // Add a commit message and dispatch.
  if (tr.docChanged)
    dispatch(tr.setMeta(trackPlugin, `Revert '${commit.message}'`))
}
// }

document.querySelector("#commit").addEventListener("submit", e => {
  e.preventDefault()
  doCommit(e.target.elements.message.value || "Unnamed")
  e.target.elements.message.value = ""
  view.focus()
})

function findInBlameMap(pos, state) {
  let map = trackPlugin.getState(state).blameMap
  for (let i = 0; i < map.length; i++)
    if (map[i].to >= pos && map[i].commit != null)
      return map[i].commit
}

document.querySelector("#blame").addEventListener("mousedown", e => {
  e.preventDefault()
  let pos = e.target.getBoundingClientRect()
  let commitID = findInBlameMap(state.selection.head, state)
  let commit = commitID != null && trackPlugin.getState(state).commits[commitID]
  let node = elt("div", {class: "blame-info"},
                 commitID != null ? elt("span", null, "It was: ", elt("strong", null, commit ? commit.message : "Uncommitted"))
                 : "No commit found")
  node.style.right = (document.body.clientWidth - pos.right) + "px"
  node.style.top = (pos.bottom + 2) + "px"
  document.body.appendChild(node)
  setTimeout(() => document.body.removeChild(node), 2000)
})
