// A simple wrapper for XHR.
function req(conf) {
  let req = new XMLHttpRequest(), aborted = false
  let result = new Promise((success, failure) => {
    req.open(conf.method, conf.url, true)
    req.addEventListener("load", () => {
      if (aborted) return
      if (req.status < 400) {
        success(req.responseText)
      } else {
        let text = req.responseText
        if (text && /html/.test(req.getResponseHeader("content-type"))) text = makePlain(text)
        let err = new Error("Request failed: " + req.statusText + (text ? "\n\n" + text : ""))
        err.status = req.status
        failure(err)
      }
    })
    req.addEventListener("error", () => { if (!aborted) failure(new Error("Network error")) })
    if (conf.headers) for (let header in conf.headers) req.setRequestHeader(header, conf.headers[header])
    req.send(conf.body || null)
  })
  result.abort = () => {
    if (!aborted) {
      req.abort()
      aborted = true
    }
  }
  return result
}
exports.req = req

function makePlain(html) {
  var elt = document.createElement("div")
  elt.innerHTML = html
  return elt.textContent.trimLeft().replace(/\n[^]*/, "")
}

function GET(url) {
  return req({url: url, method: "GET"})
}
exports.GET = GET

function POST(url, body, type) {
  return req({url: url, method: "POST", body: body, headers: {"Content-Type": type}})
}
exports.POST = POST
