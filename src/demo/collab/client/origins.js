const {Remapping} = require("prosemirror/dist/transform")
const {insertCSS} = require("prosemirror/dist/util/dom")
const {collabEditing} = require("prosemirror/dist/collab")

function buildColor(hue, sat, light) {
  function hex(off) {
    var col = Math.cos((hue + off) * 2 * Math.PI) / 2 + .5;
    var t = ((.5 * (1 - sat)) + (col * sat)) * light;
    var s = Math.floor(Math.min(t, 1) * 255).toString(16);
    if (s.length == 1) return "0" + s;
    return s;
  }
  return "#" + hex(0) + hex(.33) + hex(.67);
}

const known = Object.create(null)

function getClass(origin) {
  let cls = known[origin]
  if (cls) return cls

  // Crude string hash
  let h = 2984119
  for (let i = 0, e = origin.length; i < e; ++i)
    h = (h * 761) ^ origin.charCodeAt(i)
  h = Math.abs(h)

  let hue = (h % 100) / 100
  let sat = .5 + ((h >> 3) % 100) / 200
  let light = .8 + (h % 15 - 5) / 10
  insertCSS(".user-" + origin + " { color: " + buildColor(hue, sat, light) + " }")
  return known[origin] = "user-" + origin
}

function showOrigins(pm, steps, maps) {
  let collab = collabEditing.get(pm)
  steps.forEach((step, i) => {
    if (step.origin && step.stepType == "replace" && step.slice && step.slice.content.length) {
      let remap = new Remapping([], maps.slice(i).concat(collab.unconfirmedMaps))
      let start = remap.map(step.from, -1)
      let end = remap.map(step.to, 1)
      if (start < end) {
        let range = pm.markRange(start, end, {className: getClass(step.origin)})
        setTimeout(() => pm.removeRange(range), 1000)
      }
    }
  })
}
exports.showOrigins = showOrigins
