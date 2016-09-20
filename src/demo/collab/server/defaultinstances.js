const {schema} = require("../schema")

const $node = (type, attrs, content, marks) => schema.node(type, attrs, content, marks)
const $text = (str, marks) => schema.text(str, marks)
const em = schema.marks.em.create(), strong = schema.marks.strong.create()

function populateDefaultInstances(newInstance) {

newInstance("Example", $node("doc", null, [
  $node("heading", {level: 2}, [$text("Example Document")]),
  $node("paragraph", null, [
    $text("There is nothing here yet. "),
    $text("Add something!", [em])
  ])
]))

newInstance("Business Plan", $node("doc", null, [
  $node("heading", {level: 1}, [$text("Business Plan")]),
  $node("ordered_list", null, [
    $node("list_item", null, [$node("paragraph", null, [$text("Give away software")])]),
    $node("list_item", null, [$node("paragraph", null, [$text("???")])]),
    $node("list_item", null, [$node("paragraph", null, [$text("Profit!!!", [strong])])])
  ])
]))

newInstance("*scratch*", $node("doc", null, [
  $node("code_block", null, [
    $text(";; This buffer is for notes you don't want to save, and for Lisp evaluation.\n;; If you want to create a file, visit that file with C-x C-f,\n;; then enter the text in that file's own buffer.")
  ])
]))

newInstance("Nonsense", $node("doc", null, [
  $node("blockquote", null, [
    $node("paragraph", null, [
      $text("Mona tried to tell me"), $node("hard_break"),
      $text("To stay away from the train line."), $node("hard_break"),
      $text("She said that all the railroad men"), $node("hard_break"),
      $text("Just drink up your blood like wine."), $node("hard_break"),
      $text("An' I said, “Oh, I didn't know that,"), $node("hard_break"),
      $text("But then again, there's only one I've met"), $node("hard_break"),
      $text("An' he just smoked my eyelids"), $node("hard_break"),
      $text("An' punched my cigarette.”"), $node("hard_break"),
      $text("Oh, Mama, can this really be the end,"), $node("hard_break"),
      $text("To be stuck inside of Mobile"), $node("hard_break"),
      $text("With the Memphis blues again.")
    ]),
    $node("paragraph", null, [
      $text("— Bob Dylan, "),
      $text("Stuck Inside of Mobile with the Memphis Blues Again", [em])
    ])
  ])
]))

newInstance("Comment Section", $node("doc", null, [
  $node("heading", {level: 1}, [$text("Comment Section")]),
  $node("paragraph", null, [
    $text("The good thing about this comment section is that everybody can delete comments.")
  ]),
  $node("heading", {level: 4}, [$text("From user21841. "), $text("20 seconds ago", [em])]),
  $node("paragraph", null, [
    $text("If you look at it rationally you'll see that open-source software is communism and communism is bad because the free market is our God and savior. Also sheep caused 9/11.")
  ])
]))

}
exports.populateDefaultInstances = populateDefaultInstances
