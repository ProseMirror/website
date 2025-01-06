const loadTemplates = require("./templates.js")
const fs = require("node:fs")

const mold = loadTemplates({
  dir: __dirname + "/../../templates/",
  markdownDir: __dirname + "/../../markdown/",
  env: {require}
})

function loadReleases() {
  let input = fs.readFileSync(__dirname + "/../../markdown/CHANGELOG.md", "utf8")
  return [...input.matchAll(/(?:^|\n)## \[([\w-]+)\]\(.*?\) ([\d\.]+) \((\d+)-(\d+)-(\d+)\)\n([^]*?)(?=\n## )/g)].map(
    ([_, package, version, year, month, day, notes]) => ({
      package,
      version,
      date: new Date(year, month - 1, day).getTime(),
      notes
    }))
}

console.log(mold.defs.changelog({releases: loadReleases()}))
