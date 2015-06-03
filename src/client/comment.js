import {elt} from "prosemirror/dist/edit/dom"
import {items as inlineItems} from "prosemirror/dist/menu/inlinetooltip"
import {Item, Dialog} from "prosemirror/dist/menu/menuitem"

class CommentItem extends Item {
  constructor() { super("comment", "Add a comment") }
  apply(pm) { return new CommentDialog }
}

class CommentDialog extends Dialog {
  form(_, submit) {
    let te = elt("textarea", {name: "text",
                              placeholder: "Comment text",
                              style: "font: inherit"})
    te.addEventListener("keydown", e => {
      if (e.keyCode == 13) {
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
    addComment(pm, sel.from, sel.to, val)
  }
}

inlineItems.addItem(new CommentItem)

function randomID() {
  return Math.floor(Math.random() * 0xffffffff)
}

class Comment {
  constructor(pm, from, to, text, id) {
    this.id = id
    this.marker = pm.markRange(from, to, {className: "comment"})
    this.text = text
  }
}

function addComment(pm, from, to, text) {
  new Comment(pm, from, to, text, randomID())
}
