const {elt} = require("prosemirror/dist/util/dom")
const {Plugin} = require("prosemirror/dist/edit")
const {Subscription} = require("prosemirror/dist/util/subscription")
const {Tooltip} = require("prosemirror/dist/ui/tooltip")
const {FieldPrompt, TextField} = require("prosemirror/dist/ui/prompt")

class Comment {
  constructor(text, id, range) {
    this.id = id
    this.text = text
    this.range = range
  }
}

function notEmpty(obj) { for (let _ in obj) return true }

class CommentStore {
  constructor(pm, options) {
    this.pm = pm
    this.comments = Object.create(null)
    this.version = options.version
    this.created = Object.create(null)
    this.deleted = Object.create(null)
    this.mustSend = new Subscription
  }

  createComment(text) {
    let id = randomID()
    let sel = this.pm.selection
    this.addComment(sel.from, sel.to, text, id)
    this.created[id] = true
    this.mustSend.dispatch()
  }

  addComment(from, to, text, id) {
    if (!this.comments[id]) {
      let range = this.pm.markRange(from, to, {
        className: "comment",
        id: id,
        onRemove: () => this.removeComment(id)
      })
      this.comments[id] = new Comment(text, id, range)
    }
  }

  addJSONComment(obj) {
    this.addComment(obj.from, obj.to, obj.text, obj.id)
  }

  removeComment(id) {
    let found = this.comments[id]
    if (found) {
      this.pm.removeRange(found.range)
      delete this.comments[id]
      return true
    }
  }

  deleteComment(id) {
    if (this.removeComment(id)) {
      this.deleted[id] = true
      this.mustSend.dispatch()
    }
  }

  hasUnsentEvents() {
    return notEmpty(this.created) || notEmpty(this.deleted)
  }

  unsentEvents() {
    let result = []
    for (let id in this.created) {
      let found = this.comments[id]
      if (found) result.push({type: "create", id,
                              from: found.range.from,
                              to: found.range.to,
                              text: found.text})
    }
    for (let id in this.deleted) {
      if (!(id in this.created)) result.push({type: "delete", id})
    }
    return result
  }

  eventsSent(n) {
    this.unsent = this.unsent.slice(n)
  }

  receive(events, version) {
    events.forEach(event => {
      if (event.type == "delete") {
        if (event.id in this.deleted) delete this.deleted[event.id]
        else this.removeComment(event.id)
      } else { // "create"
        if (event.id in this.created) delete this.created[event.id]
        else this.addJSONComment(event)
      }
    })
    this.version = version
  }

  findCommentsAt(pos) {
    let found = []
    for (let id in this.comments) {
      let comment = this.comments[id]
      if (comment.range.from < pos && comment.range.to > pos)
        found.push(comment)
    }
    return found
  }
}

const commentPlugin = exports.commentPlugin = new Plugin(CommentStore, {
  version: 0
})

function randomID() {
  return Math.floor(Math.random() * 0xffffffff)
}

// Command for adding an annotation

exports.addAnnotation = function(pm, apply) {
  let comments = commentPlugin.get(pm)
  if (!comments || pm.selection.empty) return false
  if (apply !== false) new FieldPrompt(pm, "Add an annotation", {
    text: new TextField({
      label: "Annotation text",
      required: true
    })
  }).open(({text}) => comments.createComment(text))
  return true
}

exports.annotationIcon = {
  width: 1024, height: 1024,
  path: "M512 219q-116 0-218 39t-161 107-59 145q0 64 40 122t115 100l49 28-15 54q-13 52-40 98 86-36 157-97l24-21 32 3q39 4 74 4 116 0 218-39t161-107 59-145-59-145-161-107-218-39zM1024 512q0 99-68 183t-186 133-257 48q-40 0-82-4-113 100-262 138-28 8-65 12h-2q-8 0-15-6t-9-15v-0q-1-2-0-6t1-5 2-5l3-5t4-4 4-5q4-4 17-19t19-21 17-22 18-29 15-33 14-43q-89-50-141-125t-51-160q0-99 68-183t186-133 257-48 257 48 186 133 68 183z"
}

// Comment UI

class CommentUI {
  constructor(pm) {
    this.pm = pm
    this.update = pm.updateScheduler([
      pm.on.selectionChange,
      pm.on.change,
      pm.on.blur,
      pm.on.focus
    ], () => this.prepareUpdate())
    this.tooltip = new Tooltip(pm.wrapper, "below")
    this.highlighting = null
    this.displaying = null
  }

  prepareUpdate() {
    let sel = this.pm.selection, comments = commentPlugin.get(this.pm), found
    if (!comments || !sel.empty || !this.pm.hasFocus() ||
        (found = comments.findCommentsAt(sel.head)).length == 0) {
      return () => {
        this.tooltip.close()
        this.clearHighlight()
        this.displaying = null
      }
    } else {
      let id = found.map(c => c.id).join(" ")
      if (id != this.displaying) {
        this.displaying = id
        let coords = bottomCenterOfSelection()
        return () => this.tooltip.open(this.renderComments(found), coords)
      }
    }
  }

  highlightComment(comment) {
    this.clearHighlight()
    this.highlighting = this.pm.markRange(comment.range.from, comment.range.to,
                                          {className: "currentComment"})
  }

  clearHighlight() {
    if (this.highlighting) {
      this.pm.removeRange(this.highlighting)
      this.highlighting = null
    }
  }

  renderComment(comment) {
    let btn = elt("button", {class: "commentDelete", title: "Delete annotation"}, "×")
    btn.addEventListener("click", () => {
      this.clearHighlight()
      commentPlugin.get(this.pm).deleteComment(comment.id)
      this.prepareUpdate()
    })
    let li = elt("li", {class: "commentText"}, comment.text, btn)
    li.addEventListener("mouseover", e => {
      if (!li.contains(e.relatedTarget)) this.highlightComment(comment)
    })
    li.addEventListener("mouseout", e => {
      if (!li.contains(e.relatedTarget)) this.clearHighlight()
    })
    return li
  }

  renderComments(comments) {
    let rendered = comments.map(c => this.renderComment(c))
    return elt("ul", {class: "commentList"}, rendered)
  }
}

function bottomCenterOfSelection() {
  let range = window.getSelection().getRangeAt(0), rects = range.getClientRects()
  let {left, right, bottom} = rects[rects.length - 1] || range.getBoundingClientRect()
  return {top: bottom, left: (left + right) / 2}
}

exports.commentUIPlugin = new Plugin(CommentUI)
