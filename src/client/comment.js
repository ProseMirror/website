import {Pos} from "prosemirror/dist/model"
import {elt} from "prosemirror/dist/edit/dom"
import {eventMixin} from "prosemirror/dist/edit"
import {items as inlineItems} from "prosemirror/dist/menu/inlinetooltip"
import {Item, Dialog} from "prosemirror/dist/menu/menuitem"

class Comment {
  constructor(text, id, marker) {
    this.id = id
    this.text = text
    this.marker = marker
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
    let marker = this.pm.markRange(from, to, {className: "comment", id: id})
    marker.on("removed", () => this.removeComment(id))
    this.comments[id] = new Comment(text, id, marker)
  }

  addJSONComment(obj) {
    this.addComment(Pos.fromJSON(obj.from), Pos.fromJSON(obj.to), obj.text, obj.id)
  }

  removeComment(id) {
    let found = this.comments[id]
    if (found) {
      this.pm.removeRange(found.marker)
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
        if (!found || !found.marker.from) continue
        result.push({type: "create",
                     from: found.marker.from,
                     to: found.marker.to,
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
}

eventMixin(CommentStore)

function randomID() {
  return Math.floor(Math.random() * 0xffffffff)
}

// Inline menu item

class CommentItem extends Item {
  constructor() { super("comment", "Add a comment") }
  select(pm) { return pm.mod.comments }
  apply(pm) { return new CommentDialog }
}

class CommentDialog extends Dialog {
  form(_, submit) {
    let te = elt("textarea", {name: "text",
                              placeholder: "Comment text",
                              style: "font: inherit"})
    te.addEventListener("keydown", e => {
      if (e.keyCode == 13) {
        e.preventDefault()
        if (e.ctrlKey || e.shiftKey) {
          let val = te.value, selStart = te.selectionStart
          
          te.value = val.slice(0, selStart) + "\n" + val.slice(te.selectionEnd)
          te.selectionStart = selStart + 1
        } else {
          submit()
        }
      }
    })
    return elt("form", null, elt("div", null, te))
  }

  apply(form, pm) {
    let input = form.elements.text, val = input.value
    if (!val) return
    let sel = pm.selection
    pm.mod.comments.createComment(sel.from, sel.to, val)
  }
}

inlineItems.addItem(new CommentItem)
