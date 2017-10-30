!{"template": "example", "title": "ProseMirror markdown example"}

# Friendly Markdown

Imagine you have a site that allows users to enter comments, and
you've decided to use Markdown for the comment input. Your target
group mostly knows how to use Markdown, and finds it convenient. But
you may also have some non-technical users, for whom learning arcane
syntactic rules does not come naturally.

Without changing anything in your backend, you can drop in
ProseMirror as an alternative input editor. People can even switch
between both views as they are editing!

@HTML

The
[`prosemirror-markdown`](https://github.com/prosemirror/prosemirror-markdown)
package defines a ProseMirror [schema](/docs/guide/#schema) that can
express exactly the things that can be expressed in Markdown. It also
comes with a parser and serializer that convert documents in this
schema to and from Markdown text.

To abstract the actual editor, we first create a simple interface
around a textarea:

PART(MarkdownView)

And then implement the same interface for a Markdown-enabled
ProseMirror instance. The in- and output of this interface is still
Markdown text, which it internally converts to a ProseMirror document.

PART(ProseMirrorView)

Finally, we can wire up some radio buttons to allow users to switch
between these two representations.

PART(radio)
