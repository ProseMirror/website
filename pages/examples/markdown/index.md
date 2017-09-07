!{"template": "example", "title": "ProseMirror markdown example"}

<style>
  .ProseMirror { height: 120px; overflow-y: auto; box-sizing: border-box; -moz-box-sizing: border-box }
  textarea { width: 100%; height: 123px; border: 1px solid silver; box-sizing: border-box; -moz-box-sizing: border-box; padding: 3px 10px;
             border: none; outline: none }
  .ProseMirror-menubar-wrapper, #markdown textarea { display: block; margin-bottom: 4px }
</style>

# Friendly Markdown

Imagine you have a site that allows users to enter comments, and
you've decided to use Markdown for the comment input. Your target
group mostly knows how to use Markdown, and finds it convenient. But
you may also have some non-technical users, for whom learning arcane
syntactic rules does not come naturally.

Without changing anything in your backend, you can drop in
ProseMirror as an alternative input editor. People can even switch
between both views as they are editing!

The
[`prosemirror-markdown`](https://github.com/prosemirror/prosemirror-markdown)
package defines a ProseMirror [schema](/doc/guide/#schema) that can
express exactly the things that can be expressed in Markdown. It also
comes with a parser and serializer that convert documents in this
schema to and from Markdown text.


<div id="editor"></div>
<div style="text-align: center">
  <label style="border-right: 1px solid silver">
    Markdown <input type=radio name=inputformat id=radio_markdown checked>&nbsp;</label>
  <label>&nbsp;<input type=radio name=inputformat id=radio_prosemirror> WYSIWYM</label>
</div>

<div style="display: none" id="content">This is a comment written in [Markdown](http://commonmark.org). *You* may know the syntax for inserting a link, but does your whole audience?&#13;&#13;So we've given people the **choice** to use a more familiar, discoverable interface.
</div>
