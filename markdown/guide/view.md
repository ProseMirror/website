<style>
  .box {
    color: white;
    display: inline-block;
    border-radius: 5px;
    padding: 6px 10px;
    margin: 3px 0;
    vertical-align: top;
  }
</style>

A ProseMirror [editor view](##view.EditorView) is a user interface
component that displays an [editor state](#state) to the user, and
allows them to perform editing actions on it.

The definition of _editing actions_ used by the core view component is
rather narrow—it handles direct interaction with the editing surface,
such as typing, clicking, copying, pasting, and dragging, but not much
beyond that. This means that things like displaying a menu, or even
providing a full set of key bindings, lie outside of the
responsibility of the core view component, and have to be arranged
through plugins.

## Editable DOM

Browsers allow us to specify that some parts of the DOM are
[editable](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/contentEditable),
which has the effect of allowing focus and a selection in them, and
making it possible to type into them. The view creates a DOM
representation of its document (using your schema's [`toDOM`
methods](##model.NodeSpec.toDOM) by default), and makes it editable.
When the editable element is focused, ProseMirror makes sure that the
[DOM
selection](https://developer.mozilla.org/en-US/docs/Web/API/Selection)
corresponds to the selection in the editor state.

It also registers event handlers for many DOM events, which translate
the events into the appropriate [transactions](#state.transactions).
For example, when pasting, the pasted content is
[parsed](##view.EditorProps.clipboardParser) as a ProseMirror document
slice, and then inserted into the document.

Many events are also let through as they are, and only _then_
reinterpreted in terms of ProseMirror's data model. The browser is
quite good at cursor and selection placement for example (which is a
really difficult problem when you factor in bidirectional text), so
most cursor-motion related keys and mouse actions are handled by the
browser, after which ProseMirror checks what kind of [text
selection](##state.TextSelection) the current DOM selection would
correspond to. If that selection is different from the current
selection, a transaction that updates the selection is dispatched.

Even typing is usually left to the browser, because interfering with
that tends to break spell-checking, autocapitalizing on some mobile
interfaces, and other native features. When the browser updates the
DOM, the editor notices, re-parses the changed part of the document,
and translates the difference into a transaction.

## Data flow

So the editor view displays a given editor state, and when something
happens, it creates a transaction and broadcasts this. This
transaction is then, typically, used to create a new state, which is
given to the view using its
[`updateState`](##view.EditorView.updateState) method.

<div style="text-align: center; font-size: 140%">
  <div class=box style="background: #c33;"><strong>DOM event</strong></div>
  <div>↗<span style="width: 5em; display: inline-block;"></span>↘</div>
  <div>
    <div class=box style="margin-right: 4em; background: #55b"><strong>EditorView</strong></div>
    <div class=box style="background: #77e"><strong>Transaction</strong></div>
  </div>
  <div>↖<span style="width: 5em; display: inline-block;"></span>↙</div>
  <div class=box style="background: #446;">new <strong>EditorState</strong></div>
</div>

This creates a straightforward, cyclic data flow, as opposed to the
classic approach (in the JavaScript world) of a host of imperative
event handlers, which tends to create a much more complex web of data
flows.

It is possible to ‘intercept’ transactions as they are
[dispatched](##view.EditorView.dispatch) with the
[`dispatchTransaction` prop](##view.EditorProps.dispatchTransaction),
in order to wire this cyclic data flow into a larger cycle—if your
whole app is using a data flow model like this, as with
[Redux](https://github.com/reactjs/redux) and similar architectures,
you can integrate ProseMirror's transactions in your main
action-dispatching cycle, and keep ProseMirror's state in your
application ‘store’.

```javascript
// The app's state
let appState = {
  editor: EditorState.create({schema}),
  score: 0
}

let view = new EditorView(document.body, {
  state: startState,
  dispatchTransaction(transaction) {
    update({type: "EDITOR_TRANSACTION", transaction})
  }
})

// A crude app state update function, which takes an update object,
// updates the `appState`, and then refreshes the UI.
function update(event) {
  if (event.type == "EDITOR_TRANSACTION")
    appState.editor = appState.editor.apply(event.transaction)
  else if (event.type == "SCORE_POINT")
    appState.score++
  draw()
}

// An even cruder drawing function
function draw() {
  document.querySelector("#score").textContent = appState.score
  view.updateState(appState.editor)
}
```

## Efficient updating

One way to implement [`updateState`](##view.EditorView.updateState)
would be to simply redraw the document every time it is called. But
for large documents, that would be really slow.

Since, at the time of updating, the view has access to both the old
document and the new, it can compare them, and leave the parts of the
DOM that correspond to unchanged nodes alone. ProseMirror does this,
allowing it to do very little work for typical updates.

In some cases, like updates that correspond to typed text, which was
already added to the DOM by the browser's own editing actions,
ensuring the DOM and state are coherent doesn't require any DOM
changes at all. (When such a transaction is canceled or modified
somehow, the view _will_ undo the DOM change to make sure the DOM and
the state remain synchronized.)

Similarly, the DOM selection is only updated when it is actually out
of sync with the selection in the state, to avoid disrupting the
various pieces of ‘hidden’ state that browsers keep along with the
selection (such as that feature where when you arrow down or up past a
short line, you horizontal position goes back to where it was when you
enter the next long line).

## Props

‘Props’ is a useful, if somewhat vague, term taken from
[React](https://facebook.github.io/react/docs/components-and-props.html).
Props are like parameters to a UI component. Ideally, the set of props
that the component gets completely defines its behavior.

```javascript
let view = new EditorView({
  state: myState,
  editable() { return false }, // Enables read-only behavior
  onFocus() { console.log("Focusing!") }
})
```

As such, the current [state](##view.DirectEditorProps.state) is one
prop. The value of other props can also vary over time, if the code
that controls the component [updates](##view.EditorView.setProps)
them, but aren't considered _state_, because the component itself
won't change them. The [`updateState`](##view.EditorView.updateState)
method is just a shorthand to updating the [`state`
prop](##view.DirectEditorProps.state).

Plugins are also allowed to [declare](##state.PluginSpec.props) props,
except for [`state`](##view.DirectEditorProps.state) and
[`dispatchTransaction`](##view.DirectEditorProps.dispatchTransaction),
which can only be provided directly to the view.

```javascript
function maxSizePlugin(max) {
  return new Plugin({
    props: {
      editable(state) { return state.content.size < max }
    }
  })
}
```

When a given prop is declared multiple times, how it is handled
depends on the prop. In general, directly provided props take
precedence, after which each plugin gets a turn, in order. For some
props, such as [`domParser`](##view.EditorProps.domParser), the first
value that is found is used, and others are ignored. For handler
functions that return a boolean to indicate whether they handled the
event, the first one that returns true gets to handle the event. And
finally, for some props, such as
[`attributes`](##view.EditorProps.attributes) (which can be used to
set attributes on the editable DOM node) and
[`decorations`](##view.EditorProps.decoration) (which we'll get to in
the next section), the union of all provided values is used.

## Decorations

Decorations give you some control over the way the view draws your
document. They are created by returning values from the [`decorations`
prop](##view.EditorProps.decorations), and come in three types:

 - [Node decorations](##view.Decoration^node) add styling or other DOM
   attributes to a single node's DOM representation.

 - [Widget decorations](##view.Decoration^widget) _insert_ a DOM node,
   which isn't part of the actual document, at a given position.

 - [Inline decorations](##view.Decoration^inline) add styling or
   attributes, much like node decorations, but to all inline nodes in
   a given range.

In order to be able to efficiently draw and compare decorations, they
need to be provided as a [decoration set](##view.DecorationSet) (which
is a data structure that mimics the tree shape of the actual
document). You create one using the static [`create`
method](##view.DecorationSet^create), providing the document and an
array of decoration objects:

```javascript
let purplePlugin = new Plugin({
  props: {
    decorations(state) {
      return DecorationSet.create(state.doc, [
        Decoration.inline(0, state.doc.content.size, {style: "color: purple"})
      ])
    }
  }
})
```

When you have a lot of decorations, recreating the set on the fly for
every redraw is likely to be too expensive. In such cases, the
recommended way to maintain your decorations is to put the set in your
plugin's state, [map](##view.DecorationSet.map) it forward through
changes, and only change it when you need to.

```javascript
let specklePlugin = new Plugin({
  state: {
    init(_, {doc}) {
      let speckles = []
      for (let pos = 1; pos < doc.content.size; pos += 4)
        speckles.push(Decoration.inline(pos - 1, pos, {style: "background: yellow"}))
      return DecorationSet.create(doc, speckles)
    },
    apply(tr, set) { return set.map(tr.mapping, tr.doc) }
  },
  props: {
    decorations(state) { return specklePlugin.getState(state) }
  }
})
```

This plugin initializes its state to a decoration set that adds a
yellow-background inline decoration to every 4th position. That's not
terribly useful, but sort of resembles use cases like highlighting
search matches or annotated regions.

When a transaction is applied to the state, the plugin state's
[`apply` method](##state.StateField.apply) maps the decoration set
forward, causing the decorations to stay in place and ‘fit’ the new
document shape. The mapping method is (for typical, local changes)
made efficient by exploiting the tree shape of the decoration set—only
the parts of the tree that are actually touched by the changes need to
be rebuilt.

(In a real-world plugin, the `apply` method would also be the place
where you [add](##view.DecorationSet.add) or
[remove](##view.DecorationSet.remove) decorations based on new events,
possibly by inspecting the changes in the transaction, or based on
plugin-specific metadata attached to the transaction.)

Finally, the `decorations` prop simply returns the plugin state,
causing the decorations to show up in the view.

## Node views

There is one more way in which you can influence the way the editor
view draws your document. [Node views](##view.NodeView) make it
possible to [define](##view.EditorProps.nodeViews) a sort of miniature
UI components for individual nodes in your document. They allow you to
render their DOM, define the way they are updated, and write custom
code to react to events.

```javascript
let view = new EditorView({
  state,
  nodeViews: {
    image(node) { return new ImageView(node) }
  }
})

class ImageView {
  constructor(node) {
    // The editor will use this as the node's DOM representation
    this.dom = document.createElement("img")
    this.dom.src = node.attrs.src
    this.dom.addEventListener("click", e => {
      console.log("You clicked me!")
      e.preventDefault()
    })
  }

  stopEvent() { return true }
}
```

The view object that the example defines for image nodes creates its
own custom DOM node for the image, with an event handler added, and
declares, with a `stopEvent` method, that ProseMirror should ignore
events coming from that DOM node.

You'll often want interaction with the node to have some effect on the
actual node in the document. But to create a transaction that changes
a node, you first need to know where that node is. To help with that,
node views get passed a getter function that can be used to query
their current position in the document. Let's modify the example so
that clicking on the node queries you to enter an alt text for the
image:

```javascript
let view = new EditorView({
  state,
  nodeViews: {
    image(node, view, getPos) { return new ImageView(node, view, getPos) }
  }
})

class ImageView {
  constructor(node, view, getPos) {
    this.dom = document.createElement("img")
    this.dom.src = node.attrs.src
    this.dom.alt = node.attrs.alt
    this.dom.addEventListener("click", e => {
      e.preventDefault()
      let alt = prompt("New alt text:", "")
      if (alt) view.dispatch(view.state.tr.setNodeType(getPos(), null, {
        src: node.attrs.src,
        alt
      }))
    })
  }

  stopEvent() { return true }
}
```

[`setNodeType`](##transform.Transform.setNodeType) is a method that
can be used to change the type or set of attributes for the node at a
given position. In the example, we use `getPos` to find our image's
current position, and give it a new attribute object with the new alt
text.

When a node is updated, the default behavior is to leave its outer DOM
structure intact and compare its children to the new set of children,
updating or replacing those as needed. A node view can override this
with custom behavior, which allows us to do something like changing
the class of a paragraph based on its content.

```javascript
let view = new EditorView({
  state,
  nodeViews: {
    paragraph(node) { return new ParagraphView(node) }
  }
})

class ParagraphView {
  constructor(node) {
    this.dom = this.contentDOM = document.createElement("p")
    if (node.content.size == 0) this.dom.classList.add("empty")
  }

  update(node) {
    if (node.type.name != "paragraph") return false
    if (node.content.size > 0) this.dom.classList.remove("empty")
    else this.dom.classList.add("empty")
    return true
  }
}
```

Images never have content, so in our previous example, we didn't need
to worry about how that would be rendered. But paragraphs do have
content. Node views support two approaches to handling content: you
can let the ProseMirror library manage it, or you can manage it
entirely yourself. If you provide a [`contentDOM`
property](##view.NodeView.contentDOM), the library will render the
node's content into that, and handle content updates. If you don't,
the content becomes a black box to the editor, and how you display it
and let the user interact with it is entirely up to you.

In this case, we want paragraph content to behave like regular
editable text, so the `contentDOM` property is defined to be the same
as the `dom` property, since the content needs to be rendered directly
into the outer node.

The magic happens in the [`update` method](##view.NodeView.update).
Firstly, this method is responsible for deciding whether the node view
_can_ be updated to show the new node at all. This new node may be
anything that the editor's update algorithm might try to draw here, so
you must verify that this is a node that this node view can handle.

The `update` method in the example first checks whether the new node
is a paragraph, and bails out if that's not the case. Then it makes
sure that the `"empty"` class is present or absent, depending on the
content of the new node, and returns true, to indicate that the update
succeeded (at which point the node's content will be updated).
