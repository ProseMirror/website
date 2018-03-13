const {readFileSync} = require("fs")
const {request} = require("https")

let mods = ["model", "transform", "state", "view",
            "keymap", "inputrules", "history", "collab", "commands", "gapcursor",
            "schema-basic", "schema-list",
            "menu", "example-setup", "markdown", "dropcursor", "test-builder", "changeset"]

Promise.all(mods.map(mod => {
  let local
  try { local = require.resolve(`prosemirror-${mod}/CHANGELOG.md`) }
  catch(_) {}
  if (local) return Promise.resolve({mod, log: readFileSync(local, "utf8")})

  return new Promise((resolve, reject) => {
    let req = request({
      hostname: "raw.githubusercontent.com",
      path: `/ProseMirror/prosemirror-${mod}/master/CHANGELOG.md`,
      method: "GET",
      headers: {Accept: "text/plain"}
    }, response => {
      if (response.statusCode >= 300) return reject("Failed " + response.statusText)
      let buf = ""
      response.on("data", b => buf += b)
      response.on("end", () => resolve({mod, log: buf}))
      response.on("error", reject)
    })
    req.on("error", reject)
    req.end()
  })
})).then(logs => {
  let entries = []
  let release = /(?:^|\n)## ([\d\.]+) \(([\d-]+)\)\n([^]*?)(?=\n## )/g
  for (let {mod, log} of logs) {
    for (let m; m = release.exec(log);) {
      let [_, version, date, body] = m
      entries.push({date, content: `## [prosemirror-${mod}](../ref/#${mod}) ${version} (${date})\n${body}`})
    }
  }
  console.log(entries.sort((a, b) => (a.date == b.date ? 0 : a.date < b.date ? 1 : -1)).map(e => e.content).join("\n"))
})
