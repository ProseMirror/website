import {elt} from "prosemirror/dist/edit/dom"

export class Hinter {
  constructor(input, fetch, onPick) {
    this.input = input
    this.fetch = fetch
    this.lastFetched = 0
    this.onPick = onPick
    this.dom = null
    this.isOpen = this.opening = false

    this.input.addEventListener("focus", () => this.open())
    this.input.addEventListener("keydown", () => this.open())
    this.input.addEventListener("blur", () => this.close())
  }

  open() {
    if (this.lastFetched < Date.now() - 2000) {
      if (!this.opening) {
        this.opening = true
        this.fetch(list => {
          this.dom = this.DOMFromList(list)
          this.lastFetched = Date.now()
          this.opening = false
          this.open()
        })
      }
    } else if (!this.isOpen) {
      this.dom.style.display = "block"
      let rect = this.input.getBoundingClientRect()
      this.dom.style.top = (rect.bottom + pageYOffset) + "px"
      this.dom.style.left = (rect.left + pageXOffset) + "px"
      this.dom.style.minWidth = rect.width + "px"
      this.isOpen = true
    }
  }

  close() {
    if (this.isOpen) {
      this.dom.style.display = "none"
      this.isOpen = false
    }
  }

  pick(str) {
    this.input.value = str
    if (this.onPick) this.onPick(str)
  }

  DOMFromList(list) {
    let dom = document.body.appendChild(elt("ul", {class: "hint-list"}, list.map(str => elt("li", null, str))))
    dom.addEventListener("mousedown", e => {
      if (e.target.nodeName == "LI") {
        e.preventDefault()
        this.pick(e.target.textContent)
      }
    })
    return dom
  }
}
