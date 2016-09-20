class Comment {
  constructor(from, to, text, id) {
    this.from = from
    this.to = to
    this.text = text
    this.id = id
  }

  static fromJSON(json) {
    return new Comment(json.from, json.to, json.text, json.id)
  }
}
exports.Comment = Comment

class Comments {
  constructor(comments) {
    this.comments = comments || []
    this.events = []
    this.version = 0
  }

  mapThrough(mapping) {
    for (let i = this.comments.length - 1; i >= 0; i--) {
      let comment = this.comments[i]
      let from = mapping.map(comment.from, 1), to = mapping.map(comment.to, -1)
      if (from >= to) {
        this.comments.splice(i, 1)
      } else {
        comment.from = from
        comment.to = to
      }
    }
  }

  created(data) {
    this.comments.push(new Comment(data.from, data.to, data.text, data.id))
    this.events.push({type: "create", id: data.id})
    this.version++
  }

  index(id) {
    for (let i = 0; i < this.comments.length; i++)
      if (this.comments[i].id == id) return i
  }

  deleted(id) {
    let found = this.index(id)
    if (found != null) {
      this.comments.splice(found, 1)
      this.version++
      this.events.push({type: "delete", id: id})
      return
    }
  }

  eventsAfter(startIndex) {
    let result = []
    for (let i = startIndex; i < this.events.length; i++) {
      let event = this.events[i]
      if (event.type == "delete") {
        result.push(event)
      } else {
        let found = this.index(event.id)
        if (found != null) {
          let comment = this.comments[found]
          result.push({type: "create",
                       id: event.id,
                       text: comment.text,
                       from: comment.from,
                       to: comment.to})
        }
      }
    }
    return result
  }
}
exports.Comments = Comments
