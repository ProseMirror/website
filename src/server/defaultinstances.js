import {Node, style} from "prosemirror/dist/model"
import {newInstance} from "./instance"

newInstance("Example", new Node("doc", null, [
  new Node("heading", {level: 2}, [Node.text("Example Document")]),
  new Node("paragraph", null, [
    Node.text("There is nothing here yet. "),
    Node.text("Add something!", [style.em])
  ])
]))

newInstance("Business Plan", new Node("doc", null, [
  new Node("heading", {level: 1}, [Node.text("Business Plan")]),
  new Node("ordered_list", null, [
    new Node("list_item", null, [new Node("paragraph", null, [Node.text("Give away software")])]),
    new Node("list_item", null, [new Node("paragraph", null, [Node.text("???")])]),
    new Node("list_item", null, [new Node("paragraph", null, [Node.text("Profit!!!", [style.strong])])])
  ])
]))

newInstance("*scratch*", new Node("doc", null, [
  new Node("code_block", null, [
    Node.text(";; This buffer is for notes you don't want to save, and for Lisp evaluation.\n;; If you want to create a file, visit that file with C-x C-f,\n;; then enter the text in that file's own buffer.")
  ])
]))

newInstance("Nonsense", new Node("doc", null, [
  new Node("blockquote", null, [
    new Node("paragraph", null, [
      Node.text("Mona tried to tell me"), new Node.Inline("hard_break"),
      Node.text("To stay away from the train line."), new Node.Inline("hard_break"),
      Node.text("She said that all the railroad men"), new Node.Inline("hard_break"),
      Node.text("Just drink up your blood like wine."), new Node.Inline("hard_break"),
      Node.text("An' I said, “Oh, I didn't know that,"), new Node.Inline("hard_break"),
      Node.text("But then again, there's only one I've met"), new Node.Inline("hard_break"),
      Node.text("An' he just smoked my eyelids"), new Node.Inline("hard_break"),
      Node.text("An' punched my cigarette.”"), new Node.Inline("hard_break"),
      Node.text("Oh, Mama, can this really be the end,"), new Node.Inline("hard_break"),
      Node.text("To be stuck inside of Mobile"), new Node.Inline("hard_break"),
      Node.text("With the Memphis blues again.")
    ]),
    new Node("paragraph", null, [
      Node.text("— Bob Dylan, "),
      Node.text("Stuck Inside of Mobile with the Memphis Blues Again", [style.em])
    ])
  ])
]))

newInstance("Comment Section", new Node("doc", null, [
  new Node("heading", {level: 1}, [Node.text("Comment Section")]),
  new Node("paragraph", null, [
    Node.text("The good thing about this comment section is that everybody can delete comments.")
  ]),
  new Node("heading", {level: 4}, [Node.text("From user21841. "), Node.text("20 seconds ago", [style.em])]),
  new Node("paragraph", null, [
    Node.text("If you look at it rationally you'll see that open-source software is communism and communism is bad because the free market is out God and saviour. Also sheep caused 9/11.")
  ])
]))
