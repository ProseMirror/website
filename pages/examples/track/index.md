!{"template": "example", "title": "ProseMirror change tracking example"}

<style>
  .commit {
    margin-bottom: 4px;
  }
  .commit:hover {
    background: #ff8;
  }
  .commit-revert {
    color: #a22;
  }
  .commit-time {
    background: #5ab;
    padding: 0 5px;
    color: white;
    font-size: 90%;
  }
  .commit-blame {
    background: #ff8;
  }
  .blame-info {
    position: fixed;
    border: 1px solid silver;
    background: white;
    padding: 3px 8px;
    z-index: 3;
  }
  .blame-wrap {
    position: absolute;
    right: 0;
    top: 0;
  }
  #commit {
    margin: 6px 0;
    position: relative;
  }
  .blame-marker {
    background: #ff8;
  }
</style>

# Tracking changes

Changes are first-class values in ProseMirror. You can hold on to
them, and do things with them. Such as
[rebasing](/docs/guide/#transform.rebasing) them across other changes,
inverting them, or inspecting them to see what they did.

This example uses those properties to allow you to “commit” your
changes, to revert individual commits, and to find out which commit a
piece of text originates from.

This page won't list the [whole source
code](https://github.com/ProseMirror/website/blob/master/pages/examples/track/example.js)
for the example, only the most interesting parts.

The first thing we need is a way to track the commit history. An
editor plugin works well for this, since it can observe changes as
they come in. This is what the plugin's state value looks like:

PART(TrackState)

The plugin itself does little more than watch transactions and update
its state. When a meta property tagged by the plugin is present on the
transaction, it is a commit transaction, and the property's value is
the commit message.

PART(trackPlugin)

Tracking history like this allows for all kinds of useful things, such
as figuring out who added a given piece of code, and when. Or
reverting individual commits.

Reverting an old steps requires
[rebasing](/docs/guide/#transform.rebasing) the inverted form of those
steps over all intermediate steps. That is what this function does.

PART(revertCommit)

Due to the implicit conflict resolution when moving changes across
each other, outcomes of complicated reverts, where later changes touch
the same content, can sometimes be unintuitive. In a production
application, it may be desirable to detect such conflicts and provide
the user with an interface to resolve them.

<div id="editor"></div>

<form id="commit">
  Commit message: <input type=text id=message name=message> <button id=commitbutton type="submit">commit</button>
    <div class=blame-wrap><button type=button id=blame>blame at cursor</button></div>
</form>

<div id="commits"></div>

Hover over commits to highlight the text they introduced.
