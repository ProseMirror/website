var showing = null

function hashChange() {
  var hash = document.location.hash.slice(1)
  var found = document.getElementById(hash), prefix, sect
  if (found && (prefix = /^([^\.]+)/.exec(hash)) && (sect = document.getElementById("part_" + prefix[1]))) {
    if (!sect.style.display) {
      sect.style.display = "block"
      if (showing) showing.style.display = ""
      showing = sect
      var rect = found.getBoundingClientRect()
      window.scrollTo(0, hash == prefix[1] ? 0 : rect.top)
    }
  }
}

window.addEventListener("hashchange", hashChange)
hashChange()
if (!showing) {
  showing = document.querySelector("section")
  showing.style.display = "block"
}

var toc = document.querySelector("nav ul")
var openToc = null

for (var item = toc.firstChild; item; item = item.nextSibling) {
  if (item.nodeName != "li") (function(item) {
    item.addEventListener("click", function(e) {
      if (openToc == item) return
      if (openToc) openToc.className = ""
      item.className = "toc_open"
      openToc = item
    })
  }(item))
}
