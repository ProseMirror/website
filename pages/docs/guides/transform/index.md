!{"title": "ProseMirror Document Transform Guide",
  "template": "guide"}

# Document Transform Guide

This guide explains how document transforms work in ProseMirror. If
you haven't already, be sure to read the [document guide](../doc/)
first.

## Why?

Why can't you just mutate the document and be done with it? Or at
least create a new version of a document and just set the editor's
[`doc`](##state.EditorState.doc) property to it?

There are several reasons. One is code clarity. Immutable data
structures really do lead to cleaner code. But the transform system
also allows us to leave a _trail_ of updates, in the form of values
that represent the individual steps taken to go from an old version of
the document to a new one. This is used to implement the undo history,
[collaborative editing](http://marijnhaverbeke.nl/blog/collaborative-editing.html),
and other potentially useful things, such as
[change tracking](/examples/track/).

In short, if you create a fresh [state](##state.EditorState) to update
the document in your editor, you will reset the undo history and make
collaborative editing break. If you use transforms, things just work.

## Steps

Updates to documents are decomposed into [steps](##transform) that
describe an update. You usually don't need to work with these
directly, but it is useful to know how they work.

Examples of steps are [`ReplaceStep`](##transform.ReplaceStep) to
replace a piece of a document, or
[`AddMarkStep`](##transform.AddMarkStep) to add a mark to a given
range.

When a step is applied to a document, it returns a
[value](##transform.StepResult) that holds either a new document or,
if the step can't be meaningfully applied to the document, a failure
message. A step can be [inverted](##transform.Step.invert), producing
a new step that exactly undoes the thing the step did. This is how the
undo history is implemented.

You can also [get](##transform.Step.getMap) a
[change map](##transform.StepMap) from a step. This is a data
structure that describes the parts of the document it replaces, which
can be used, among other things, to map
[positions](../doc/#indexing) in the old document to positions in
the new one (or [vice-versa](##transform.StepMap.invert)).

## Transforms

To make accumulating a bunch of steps convenient, the
[`Transform`](##transform.Transform) abstraction is an object that
wraps a document, and provides a number of methods that allow you to
make changes to that document, accumulating steps and position maps in
the process. For each step, it will immediately compute the document.

When working with an editor, you'll usually want to create a
[`Transaction`](##state.Transaction), which is a subclass of
`Transform` that also knows about other [editor
state](##state.EditorState) fields, adds some convenient
selection-aware [methods](##state.Transaction.replaceSelection),
and can be used to [create](##state.EditorState.apply) a new editor
state.

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

    stepA(doc0) = docA
    stepB(doc0) = docB
    stepB(docA) = MISMATCH!
    rebase(stepB, mapA) = stepB'
    stepB'(docA) = docAB

The [`map`](##transform.Step.map) method on step objects takes a
[mappable](##transform.Mappable) thing (such as a
[position map](##transform.StepMap) or [mapping](##transform.Mapping),
which each `Transform` object [has one](##transform.Transform.mapping)
of), and maps the positions associated with the step through it. This
may end up returning `null`, if the content the step applied to was
deleted by the steps that produced the mapping.

Things get more complicated when you want to rebase a chain of steps
over another chain of steps.

    stepA2(stepA1(doc0)) = docA
    stepB2(stepB1(doc0)) = docB
    ???(docA) = docAB

We can map `stepB1` over `stepA1` and then `stepA2`, to get `stepB1'`.
But with `stepB2`, which starts at the document produced by
`stepB1(doc0)`, and whose mapped version must apply to the document
produced by `stepB1'(docA)`, things get more difficult. It must be
mapped over the following chain of maps:

    rebase(stepB2, [invert(mapB1), mapA1, mapA2, mapB1'])

I.e. first the inverse of the map for `stepB1` to `doc0`, then through
the pipeline of maps produced by applying `stepA1` and `stepA2`, and
finally through the map produced by applying `stepB1'` to `docA`.

If there was a `stepB3`, we'd get the pipeline for that one by taking
the one above, prefixing it with `invert(mapB2)` and adding `mapB2'`
to the end. And so on.

But when `stepB1` inserted some content, and `stepB2` did something to
that content, then mapping `stepB2` through `invert(mapB1)` will
return `null`, because the inverse of `stepB1` _deletes_ the content
to which it applies. However, this content is reintroduced later in
the pipeline, by `mapB1`. The [`Mapping`](##transform.Mapping)
abstraction provides a way to track such pipelines, including the
inverse relations between the maps in it. You can map steps through it
in such a way that they survive situations like the one above.
