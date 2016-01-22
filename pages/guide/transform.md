!{"title": "ProseMirror Document Transform Guide",
  "template": "guide"}

# Document Transform Guide

This guide explains how document transforms work in ProseMirror. If
you haven't already, be sure to read the [document guide](./doc.html)
first.

## Why?

Why can't you just mutate the document and be done with it? Or at
least create a new version of a document and just set the editor's
[`doc`](##ProseMirror.doc) property to it?

There are several reasons. One is code clarity. Immutable data
structures really do lead to cleaner code. But the transform system
also allows us to leave a _trail_ of updates, in the form of values
that represent the individual steps taken to go from an old version of
the document to a new one. This is used to implement the undo history,
[collaborative editing](http://marijnhaverbeke.nl/blog/collaborative-editing.html),
and other potentially useful things, such as
[change tracking](../demo/track.html).

In short, if you use [`setDoc`](##ProseMirror.setDoc) to update the
document in your editor, you will reset the undo history and cause an
error if your editor has collaborative editing enabled. If you use
transforms, no such problems occur.

## Steps

Updates to documents are decomposed into [steps](##transform) that
describe an update. You usually don't need to work with these
directly, but it is useful to know how they work.

Examples of steps are [`"join"`](##Transform.join) to join two
adjacent nodes together, or [`"addMark`](##Transform.addMark) to add a
mark to a given range.

When a step is applied to a document, it produces a new document,
along with a [position map](##PosMap) that can be used to map
[positions](##Pos) in the old document to positions in the new one (or
[vice-versa](##PosMap.invert)).

A step can be [inverted](##Step.invert), producing a new step that
exactly undoes the thing the step did. This is how the undo history is
implemented.

## Transforms

To make accumulating a bunch of steps convenient, the
[`Transform`](##Transform) abstraction is an object that wraps a
document, and provides a number of methods that allow you to make
changes to that document, accumulating steps and position maps in the
process. For each step, it will immediately compute the document.

When working with an editor, you'll usually want to create an
[`EditorTransform`](##EditorTransform), which adds some
selection-related [methods](##EditorTransform.replaceSelection), and
an [`apply`](##EditorTransform.apply) method to _commit_ the changes
to the editor.

## Rebasing

When doing more complicated things with steps and position maps, for
example to implement your own change tracking, or to integrate some
feature with collaborative editing, you might run into the need to
_rebase_ steps.

You might not want to bother studying this until you are sure you need
it.

Rebasing, in the simple case, is the process of taking two steps that
start with the same document, and transform one of them so that it can
be applied to the document created by the other instead. In pseudocode:

    stepA(doc0) = (docA, mapA)
    stepB(doc0) = (docB, mapB)
    stepB(docA) = MISMATCH!
    rebase(stepB, mapA) = stepB'
    stepB'(docA) = docAB

The [`map`](##Step.map) method on step objects takes a
[mappable](##Mappable) thing (such as a [position map](##PosMap) or
[transform](##Transform)), and maps the positions associated with the
step through it. This may end up returning `null`, if the content the
step applied to was deleted by the steps that produced the mapping.

Things get more complicated when you want to rebase a chain of steps
over another chain of steps.

    stepA2(stepA1(doc0)) = (docA, mapA)
    stepB2(stepB1(doc0)) = (docB, mapB)
    ???(docA) = docAB

We can map `stepB1` over `stepA1` and then `stepA2`, to get `stepB1'`.
But with `stepB2`, which starts at the document produced by
`stepB1(doc0)`, and whose mapped version must apply to the document
produced by `stepB1'(docA)`, things get more difficult. It must be
mapped over the following chain of maps:

    rebase(stepB2, [invert(mapB1), mapA1, mapA2, mapB1'])

I.e. first the inverse of the map that was produced by applying
`stepB1` to `doc0`, then through the pipeline of maps produced by
applying `stepA1` and `stepA2`, and finally through the map produced
by applying `stepB1'` to `docA`.

If there was a `stepB3`, we'd get the pipeline for that one by taking
the one above, prefixing it with `invert(mapB2)` and adding `mapB2'`
to the end. And so on.

But when `stepB1` inserted some content, and `stepB2` did something to
that content, then mapping `stepB2` through `invert(mapB1)` will
return `null`, because the inverse of `stepB1` _deletes_ the content
to which it applies. However, this content is reintroduced later in
the pipeline, by `mapB1`. The [`Remapping`](##Remapping) abstraction
provides a way to track such pipelines, including the inverse
relations between the maps in it. You can map steps through it in such
a way that they survive situations like the one above.
