export function req(conf, callback) {
  let req = new XMLHttpRequest()
  req.open(conf.method, conf.url, true)
  req.addEventListener("load", () => {
    if (req.status < 400) {
      callback(null, req.responseText)
    } else {
      let text = req.responseText
      if (text && /html/.test(req.getResponseHeader("content-type"))) text = makePlain(text)
      let err = new Error("Request failed: " + req.statusText + (text ? "\n\n" + text : ""))
      err.status = req.status
      callback(err)
    }
  })
  req.addEventListener("error", () => callback(new Error("Network error")))
  if (conf.headers) for (let header in conf.headers) req.setRequestHeader(header, conf.headers[header])
  req.send(conf.body || null)
  return req
}

function makePlain(html) {
  var elt = document.createElement("div")
  elt.innerHTML = html
  return elt.textContent.trimLeft().replace(/\n[^]*/, "")
}

export function GET(url, callback) {
  return req({url: url, method: "GET"}, callback)
}

export function POST(url, body, type, callback) {
  return req({url: url, method: "POST", body: body, headers: {"Content-Type": type}}, callback)
}
