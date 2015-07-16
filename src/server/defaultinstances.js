import {Node, Span, style} from "prosemirror/dist/model"
import {newInstance} from "./instance"

newInstance("Example", new Node("doc", null, [
  new Node("heading", {level: 2}, [Span.text("Example Document")]),
  new Node("paragraph", null, [
    Span.text("There is nothing here yet. "),
    Span.text("Add something!", [style.em])
  ])
]))

newInstance("Business Plan", new Node("doc", null, [
  new Node("heading", {level: 1}, [Span.text("Business Plan")]),
  new Node("ordered_list", null, [
    new Node("list_item", null, [new Node("paragraph", null, [Span.text("Give away software")])]),
    new Node("list_item", null, [new Node("paragraph", null, [Span.text("???")])]),
    new Node("list_item", null, [new Node("paragraph", null, [Span.text("Profit!!!", [style.strong])])])
  ])
]))

newInstance("*scratch*", new Node("doc", null, [
  new Node("code_block", null, [
    Span.text(";; This buffer is for notes you don't want to save, and for Lisp evaluation.\n;; If you want to create a file, visit that file with C-x C-f,\n;; then enter the text in that file's own buffer.")
  ])
]))

newInstance("Nonsense", new Node("doc", null, [
  new Node("blockquote", null, [
    new Node("paragraph", null, [
      Span.text("Mona tried to tell me"), new Span("hard_break"),
      Span.text("To stay away from the train line."), new Span("hard_break"),
      Span.text("She said that all the railroad men"), new Span("hard_break"),
      Span.text("Just drink up your blood like wine."), new Span("hard_break"),
      Span.text("An' I said, “Oh, I didn't know that,"), new Span("hard_break"),
      Span.text("But then again, there's only one I've met"), new Span("hard_break"),
      Span.text("An' he just smoked my eyelids"), new Span("hard_break"),
      Span.text("An' punched my cigarette.”"), new Span("hard_break"),
      Span.text("Oh, Mama, can this really be the end,"), new Span("hard_break"),
      Span.text("To be stuck inside of Mobile"), new Span("hard_break"),
      Span.text("With the Memphis blues again.")
    ]),
    new Node("paragraph", null, [
      Span.text("— Bob Dylan, "),
      Span.text("Stuck Inside of Mobile with the Memphis Blues Again", [style.em])
    ])
  ])
]))

newInstance("Comment Section", new Node("doc", null, [
  new Node("heading", {level: 1}, [Span.text("Comment Section")]),
  new Node("paragraph", null, [
    Span.text("The good thing about this comment section is that everybody can delete comments.")
  ]),
  new Node("heading", {level: 4}, [Span.text("From user21841. "), Span.text("20 seconds ago", [style.em])]),
  new Node("paragraph", null, [
    Span.text("If you look at it rationally you'll see that open-source software is communism and communism is bad because the free market is our God and savior. Also sheep caused 9/11.")
  ])
]))
