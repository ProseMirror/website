!{"template": "example", "title": "ProseMirror embedded editor example"}

# Embedded code editor

It can be useful to have the in-document representation of some node,
such as a code block, math formula, or image, show up as a custom
editor control specifically for such content. [Node
views](##view.NodeView) are a ProseMirror feature that make this
possible.

<div id="editor"></div>

<div id=content style="display: none">
<h3>The code block is a code editor</h3>
<p>This editor has been wired up to render code blocks as instances of
the <a href="http://codemirror.net">CodeMirror</a> code editor, which
provides syntax highlighting, auto-indentation, and similar.</p>
<pre>
function max(a, b) {
  return a > b ? a : b
}</pre>
<p>Any changes made inside the editor are directly propagated to the
surrounding ProseMirror document, so that you can for example apply
ProseMirror's undo/redo to them.</p>
</div>

<link rel=stylesheet href="../../css/codemirror.css">
<style>
  .CodeMirror {
    border: 1px solid #eee;
    height: auto;
  }
  .CodeMirror pre { white-space: pre !important }
</style>
