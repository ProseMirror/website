import {elt} from "prosemirror/dist/dom"
import insertCSS from "prosemirror/node_modules/insert-css"

export class Reporter {
  constructor() {
    this.state = this.node = null
    this.setAt = 0
  }

  clearState() {
    if (this.state) {
      document.body.removeChild(this.node)
      this.state = this.node = null
      this.setAt = 0
    }
  }

  failure(err) {
    this.show("fail", err.toString())
  }

  delay(err) {
    if (this.state == "fail") return
    this.show("delay", err.toString())
  }

  show(type, message) {
    this.clearState()
    this.state = type
    this.setAt = Date.now()
    this.node = elt("div", {class: "ProseMirror-report ProseMirror-report-" + type}, message)
    document.body.appendChild(this.node)
  }

  success() {
    if (this.state == "fail" && this.setAt > Date.now() - 1000 * 10) return
    this.clearState()
  }
}

insertCSS(`

.ProseMirror-report {
  position: fixed;
  top: 0; right: 0;
  border-bottom-left-radius: 5px;
  border-width: 1px;
  border-top-width: 0;
  border-right-width: 0;
  border-style: solid;
  padding: 3px 27px 5px 12px;
  white-space: pre;
}

.ProseMirror-report-fail {
  background: rgb(255, 230, 230);
  border-color: rgb(200, 150, 150);
}

.ProseMirror-report-delay {
  background: rgb(255, 255, 200);
  border-color: rgb(200, 200, 120);
}

`)
