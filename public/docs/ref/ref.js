(function() {
  // Highlight module currently scrolled into view

  let sections = document.querySelectorAll("#toc a[href]")
  console.log(sections)

  function nodeAt(x, y) {
    if (document.caretPositionFromPoint) {
      let pos = document.caretPositionFromPoint(x, y)
      if (pos) return pos.offsetNode
    } else if (document.caretRangeFromPoint) {
      let range = document.caretRangeFromPoint(x, y)
      if (range) return range.startContainer
    }
  }

  function updateCurrentSection() {
    let node = nodeAt(innerWidth / 2, innerHeight / 8)
    for (; node; node = node.parentNode) {
      if (node.nodeName == "SECTION") {
        let id = node.querySelector("h2[id]")
        if (id) {
          let href = "#" + encodeURIComponent(id.id)
          for (let i = 0; i < sections.length; i++) {
            sections[i].classList.toggle("current-section", sections[i].getAttribute("href") == href)
          }
        }
      }
    }
  }

  setTimeout(updateCurrentSection, 200)
  let updating = false
  window.onscroll = () => {
    if (updating) return
    updating = true
    setTimeout(() => {
      updating = false
      updateCurrentSection()
    }, 200)
  }
})()
