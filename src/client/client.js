import {Node} from "prosemirror/dist/model"
import {ProseMirror} from "prosemirror/dist/edit"
import "prosemirror/dist/collab"

import {GET, POST} from "./http"

function report(err) {
  console.log("ERROR:", err.toString()) // FIXME
}

class Channel {
  constructor(url, version) {
    this.url = url
    this.version = version
    this.listener = null
    this.sending = this.polling = false
  }

  listen(f) {
    this.listener = f
    this.poll()
  }

  send(version, steps, callback) {
    this.sending = true
    if (this.polling) this.polling.abort()
    console.log("sending", steps.length, this.version)

    POST(this.url + "/steps",
         JSON.stringify({version: version, steps: steps}),
         "application/json",
         err => {
      if (err && err.status != 406) {
        report(err)
        // FIXME retry a few times then callback(false)? this leaves
        // client never sending anything again
        // Move scheduling responsibility out of the collab module entirely?
      } else {
        let ok = !err
        console.log("sent", steps.length, ok)
        callback(ok)
        if (ok) this.version += steps.length
        this.sending = false
        this.poll()
      }
    })
  }

  poll() {
    if (this.polling) return
    console.log("start polling @", this.version)
    this.polling = GET(this.url + "/steps/" + this.version, (err, steps) => {
      this.polling = false
      console.log("received response", steps.length, this.version, this.sending)
      if (this.sending) return

      if (err) {
        report(err) // FIXME swallow a few errors before giving up
        setTimeout(() => this.poll(), 500)
      } else {
        steps = JSON.parse(steps)
        if (steps.length) {
          this.version += steps.length
          this.listener(steps)
        }
        this.poll()
      }
    })
  }

  static start(url, callback) {
    GET(url, (err, data) => {
      data = JSON.parse(data)
      callback(err, !err && {channel: new Channel(url, data.version),
                             doc: Node.fromJSON(data.doc)})
    })
  }
}

Channel.start("/doc/test", (err, data) => {
  if (err) return report(err)
  window.pm = new ProseMirror({
    place: document.body,
    doc: data.doc,
    collab: {channel: data.channel,
             version: data.channel.version}
  })
})
