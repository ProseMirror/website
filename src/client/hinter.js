import {elt} from "prosemirror/dist/edit/dom"

export class Hinter {
  constructor(input, fetch, onPick) {
    this.input = input
    this.fetch = fetch
    this.lastFetched = 0
    this.onPick = onPick
    this.items = this.dom = null
    this.isOpen = this.opening = false
    this.selected = -1

    this.input.addEventListener("focus", () => this.open())
    this.input.addEventListener("keydown", e => {
      this.open()
      if (e.keyCode == 38 || e.keyCode == 40) {
        e.preventDefault()
        this.moveSelection(e.keyCode == 38 ? -1 : 1)
      }
    })
    this.input.addEventListener("input", () => this.updateDOM())
    this.input.addEventListener("blur", () => this.close())
  }

  open() {
    if (this.isOpen) return

    if (this.lastFetched < Date.now() - 2000) {
      if (!this.opening) {
        this.opening = true
        this.fetch(list => {
          this.items = list
          this.updateDOM()
          this.lastFetched = Date.now()
          this.opening = false
          this.open()
        })
      }
    } else {
      this.isOpen = true
      this.updateDOM()
      this.placeDOM()
    }
  }

  close() {
    if (this.isOpen) {
      this.dom.style.display = "none"
      this.isOpen = false
      this.selected = -1
    }
  }

  pick(str) {
    this.input.value = str
    if (this.onPick) this.onPick(str)
  }

  moveSelection(dir) {
    if (this.isOpen) {
      let n = this.dom.childNodes.length
      let newPos = ((this.selected != -1 ? this.selected + dir : dir < 0 ? n - 1 : 0) + n) % n
      this.setSelection(newPos, true)
    }
  }

  setSelection(n, setVal) {
    let selected = this.dom.querySelector(".selectedhint")
    if (selected) selected.className = ""
    if (n > -1) {
      let elt = this.dom.childNodes[n]
      elt.className = "selectedhint"
      if (setVal) this.input.value = elt.textContent
    }
    this.selected = n
  }

  updateDOM() {
    if (!this.isOpen) return

    let selectedText = this.selected == -1 ? null : this.dom.childNodes[this.selected].textContent
    if (this.dom) this.dom.parentNode.removeChild(this.dom)
    let value = this.input.value
    let matchingItems = this.items.filter(i => i.indexOf(value) > -1)
    let items = matchingItems.map(i => elt("li", null, i))
    this.dom = document.body.appendChild(elt("ul", {class: "hint-list"}, items))
    this.dom.addEventListener("mousedown", e => {
      e.preventDefault()
      if (e.target.nodeName == "LI")
        this.pick(e.target.textContent)
    })
    this.setSelection(matchingItems.indexOf(selectedText))
    this.placeDOM()
  }

  placeDOM() {
    if (this.dom.firstChild) {
      this.dom.style.display = "block"
      let rect = this.input.getBoundingClientRect()
      this.dom.style.top = (rect.bottom + pageYOffset) + "px"
      this.dom.style.left = (rect.left + pageXOffset) + "px"
      this.dom.style.minWidth = rect.width + "px"
    } else {
      this.dom.style.display = "none"
    }
  }
}
