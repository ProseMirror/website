!{"template": "example", "title": "ProseMirror tooltip example"}

<style>
  .tooltip {
    position: absolute;
    pointer-events: none;
    z-index: 20;
    background: white;
    border: 1px solid silver;
    border-radius: 2px;
    padding: 2px 10px;
    margin-bottom: 7px;
    -webkit-transform: translateX(-50%);
    transform: translateX(-50%);
  }
  .tooltip:before {
    content: "";
    height: 0; width: 0;
    position: absolute;
    left: 50%;
    margin-left: -5px;
    bottom: -6px;
    border: 5px solid transparent;
    border-bottom-width: 0;
    border-top-color: silver;
  }
  .tooltip:after {
    content: "";
    height: 0; width: 0;
    position: absolute;
    left: 50%;
    margin-left: -5px;
    bottom: -4.5px;
    border: 5px solid transparent;
    border-bottom-width: 0;
    border-top-color: white;
  }
  #editor { position: relative; }
</style>

# Tooltips

I'm using ‘tooltip’ to mean a small interface element hovering over
the rest of the interface. These can be very useful in editors to show
extra controls or information, for example as in a ‘Medium-style’
editing interface (named after the popular blogging platform), where
most controls are hidden until you select something, at which point
they pop up as a little bubble above the selection.

There are two common ways to implement tooltips in ProseMirror. The
easiest is to insert widget
[decorations](/docs/guide/#view.decorations) and absolutely position
them, relying on the fact that if you don't specify an explicit
position (as in a `left` or `bottom` property), such elements are
positioned at the point in the document flow where they are placed.
This works well for tooltips that correspond to a specific position.

If you want to position something above the selection, or you want to
animate transitions, or you need to be able to allow the tooltips to
stick out of the editor when the editor's `overflow` property isn't
`visible` (for example to make it scroll), then decorations are
probably not practical. In such a case, you'll have to ‘manually’
position your tooltips.

<div id=editor></div>

But you can still make use of ProseMirror's update cycle to make sure
the tooltip stays in sync with the editor state. We can use a [plugin
view](##state.PluginSpec.view) to create a view component tied to the
editor's life cycle.

PART(plugin)

The actual view creates a DOM node to represent the tooltip and
inserts it into the document alongside the editor.

PART(tooltip)

Whenever the editor state updates, it checks whether it needs to
update the tooltip. The positioning calculatings are a bit involved,
but such is life with CSS. Basically, it uses ProseMirror's
[`coordsAtPos` method](##view.EditorView.coordsAtPos) to find the
screen coordinates of the selection, and uses those to set a `left`
and `bottom` property relative to the tooltip's offset parent, which
is the nearest absolutely or relatively positioned parent.

<div style="display: none" id=content>
  <p>Select some text to see a tooltip with the size of your selection.</p>
  <p>(That's not the most useful use of a tooltip, but it's a nicely simple example.)</p>
</div>