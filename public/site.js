(function() {
  if (!window.addEventListener) return
  var pending = false, current = null

  function updateSoon() {
    if (!pending) {
      pending = true
      setTimeout(update, 250)
    }
  }

  var nav = document.querySelector("nav")

  function update() {
    pending = false
    var marks = nav.querySelectorAll("ul a"), found
    for (var i = 0; i < marks.length; ++i) {
      var mark = marks[i], m
      if (mark.getAttribute("data-default")) {
        if (found == null) found = i
      } else if (m = mark.href.match(/#(.*)/)) {
        var ref = document.getElementById(m[1])
        if (ref) {
          var rect = ref.getBoundingClientRect()
          if (rect.top != rect.bottom && rect.top < 150) {
            found = mark
          }
        }
      }
    }
    set(found)
  }

  function set(val) {
    if (val && val != current) {
      if (current) current.className = ""
      val.className = "active"
      current = val
    }
  }

  window.addEventListener("scroll", updateSoon)
  window.addEventListener("load", updateSoon)
  window.addEventListener("hashchange", function() {
    setTimeout(function() {
      var hash = document.location.hash, found = null, m
      var marks = nav.querySelectorAll("ul a")
      for (var i = 0; i < marks.length; i++)
        if ((m = marks[i].href.match(/(#.*)/)) && m[1] == hash) { set(marks[i]); break }
    }, 300)
  })

  document.querySelector(".menubutton").addEventListener("click", function(e) {
    nav.className = nav.className ? "" : "open"
    e.preventDefault()
  })
})()
