import {Pos} from "prosemirror/dist/model"
import {elt} from "prosemirror/dist/dom"
import {eventMixin} from "prosemirror/dist/edit"
import {Debounced} from "prosemirror/dist/util/debounce"

import {registerItem, IconItem, DialogItem} from "prosemirror/dist/menu/items"
import {Tooltip} from "prosemirror/dist/menu/tooltip"

class Comment {
  constructor(text, id, range) {
    this.id = id
    this.text = text
    this.range = range
  }
}

export class CommentStore {
  constructor(pm, version) {
    pm.mod.comments = this
    this.pm = pm
    this.comments = Object.create(null)
    this.version = version
    this.unsent = []
  }

  createComment(text) {
    let id = randomID()
    let sel = this.pm.selection
    this.addComment(sel.from, sel.to, text, id)
    this.unsent.push({type: "create", id: id})
    this.signal("mustSend")
  }

  addComment(from, to, text, id) {
    if (!this.comments[id]) {
      let range = this.pm.markRange(from, to, {className: "comment", id: id})
      range.on("removed", () => this.removeComment(id))
      this.comments[id] = new Comment(text, id, range)
    }
  }

  addJSONComment(obj) {
    this.addComment(Pos.fromJSON(obj.from), Pos.fromJSON(obj.to), obj.text, obj.id)
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
      this.unsent.push({type: "delete", id: id})
      this.signal("mustSend")
    }
  }

  hasUnsentEvents() {
    return this.unsent.length
  }

  unsentEvents() {
    let result = []
    for (let i = 0; i < this.unsent.length; i++) {
      let event = this.unsent[i]
      if (event.type == "delete") {
        result.push({type: "delete", id: event.id})
      } else { // "create"
        let found = this.comments[event.id]
        if (!found || !found.range.from) continue
        result.push({type: "create",
                     from: found.range.from,
                     to: found.range.to,
                     id: found.id,
                     text: found.text})
      }
    }
    return result
  }

  eventsSent(n) {
    this.unsent = this.unsent.slice(n)
  }

  receive(events, version) {
    events.forEach(event => {
      if (event.type == "delete")
        this.removeComment(event.id)
      else // "create"
        this.addJSONComment(event)
    })
    this.version = version
  }

  findCommentsAt(pos) {
    let found = []
    for (let id in this.comments) {
      let comment = this.comments[id]
      if (comment.range.from.cmp(pos) < 0 && comment.range.to.cmp(pos) > 0)
        found.push(comment)
    }
    return found
  }
}

eventMixin(CommentStore)

function randomID() {
  return Math.floor(Math.random() * 0xffffffff)
}

// Inline menu item

class CommentItem extends IconItem {
  constructor() { super("comment", "Add annotation") }
  select(pm) { return pm.mod.comments }
  apply() { return [new CommentDialog] }
}
registerItem("inline", new CommentItem)

class CommentDialog extends DialogItem {
  form() {
    let te = elt("textarea", {name: "text",
                              placeholder: "Annotation text",
                              style: "font: inherit; width: 14em"})
    te.addEventListener("keydown", e => {
      if (e.keyCode == 13 && (e.ctrlKey || e.metaKey || e.shiftKey)) {
        e.preventDefault()
        let val = te.value, selStart = te.selectionStart
        te.value = val.slice(0, selStart) + "\n" + val.slice(te.selectionEnd)
        te.selectionStart = selStart + 1
      }
    })
    return elt("form", null, elt("div", null, te))
  }

  apply(form, pm) {
    let input = form.elements.text, val = input.value
    if (val) pm.mod.comments.createComment(val)
  }
}

// Comment UI

export class CommentUI {
  constructor(pm) {
    this.pm = pm
    pm.mod.commentUI = this
    this.debounced = new Debounced(pm, 100, () => this.update())
    pm.on("selectionChange", this.updateFunc = () => this.debounced.trigger())
    pm.on("change", this.updateFunc)
    pm.on("blur", this.updateFunc)
    pm.on("focus", this.updateFunc)
    this.tooltip = new Tooltip(pm, "below")
    this.tooltip.reset = this.updateFunc
    this.highlighting = null
    this.displaying = null
  }

  update() {
    let sel = this.pm.selection, comments
    if (!this.pm.mod.comments || !sel.empty || !this.pm.hasFocus() ||
        (comments = this.pm.mod.comments.findCommentsAt(sel.head)).length == 0) {
      this.tooltip.close()
      this.clearHighlight()
      this.displaying = null
    } else {
      let id = comments.map(c => c.id).join(" ")
      if (id != this.displaying) {
        this.displaying = id
        this.tooltip.open(this.renderComments(comments), bottomCenterOfSelection())
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
      this.pm.mod.comments.deleteComment(comment.id)
      this.update()
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
  let rects = window.getSelection().getRangeAt(0).getClientRects()
  let {left, right, bottom} = rects[rects.length - 1]
  return {top: bottom, left: (left + right) / 2}
}
