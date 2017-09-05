!{"template": "example", "title": "ProseMirror basic example"}

# Setting up an editor

Using the [example
setup](https://github.com/prosemirror/prosemirror-example-setup),
[example menu](https://github.com/prosemirror/prosemirror-menu), and
[basic
schema](https://github.com/prosemirror/prosemirror-schema-basic)
modules, setting up an editor can be done in a few lines.

PART(code)

(In a more demanding situation, where you want to configure your
editor and wire it into your own UI style, you'll probably want to
swap out the example setup and menu modules with something custom, and
adjust the schema to your needs.)

<div id=editor></div>

<div style="display: none" id="content">
  <h3>Using ProseMirror</h3>

  <p>This is editable text. You can focus it and start typing.</p>

  <p>To apply styling, you can select a piece of text and manipulate
  its styling from the menu. The basic schema
  supports <em>emphasis</em>, <strong>strong
  text</strong>, <a href="http://marijnhaverbeke.nl/blog">links</a>, <code>code
  font</code>, and <img src="/img/smiley.png"> images.</p>

  <p>Block-level structure is manipulated, depending on the current
  menu style, either through the top menubar, or through the
  “hamburger” menu to the right of the selected paragraph. This allows
  you to change paragraphs into headers or code blocks, to wrap them
  in lists or blockquotes, to unwrap them, and to insert things like
  horizontal rules.</p>

  <p>Try using the "indent” item in the menu to wrap this paragraph in
  a numbered list.</p>

  <p>And turn this paragraph into a code block.</p>
</div>
