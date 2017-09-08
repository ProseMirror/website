!{"template": "example", "title": "ProseMirror markdown example"}

<style>
  .ProseMirror { height: 120px; overflow-y: auto; box-sizing: border-box; -moz-box-sizing: border-box }
  textarea { width: 100%; height: 123px; border: 1px solid silver; box-sizing: border-box; -moz-box-sizing: border-box; padding: 3px 10px;
             border: none; outline: none; font-family: inherit; font-size: inherit }
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

<div id="editor" style="margin-bottom: 0"></div>
<div style="text-align: center">
  <label style="border-right: 1px solid silver">
    Markdown <input type=radio name=inputformat value=markdown checked>&nbsp;</label>
  <label>&nbsp;<input type=radio name=inputformat value=prosemirror> WYSIWYM</label>
</div>

The
[`prosemirror-markdown`](https://github.com/prosemirror/prosemirror-markdown)
package defines a ProseMirror [schema](/doc/guide/#schema) that can
express exactly the things that can be expressed in Markdown. It also
comes with a parser and serializer that convert documents in this
schema to and from Markdown text.

To abstract the actual editor, we first create a simple interface
around a textarea:

PART(MarkdownView)

And then implement the same interface for a Markdown-enabled
ProseMirror instance. The in- and output of this interface is still
Markdown text, which it internall converts to a ProseMirror document.

PART(ProseMirrorView)

Finally, we can wire up some radio buttons to allow users to switch
between these two representations.

PART(radio)

<div style="display: none"><textarea id="content">This is a comment written in [Markdown](http://commonmark.org). *You* may know the syntax for inserting a link, but does your whole audience?&#13;&#13;So you can give people the **choice** to use a more familiar, discoverable interface.</textarea></div>
