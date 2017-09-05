[Transforms](##transform.Transform) are central to the way ProseMirror
works. They form the basis for [transactions](#state.transactions),
and are what makes history tracking and collaborative editing
possible.

## Why?

Why can't we just mutate the document and be done with it? Or at least
create a new version of a document and just put that into the editor?

There are several reasons. One is code clarity. Immutable data
structures really do lead to simpler code. But the main thing the
transform system does is to leave a _trail_ of updates, in the form of
values that represent the individual steps taken to go from an old
version of the document to a new one.

The [undo history](##history) can save these steps and apply their
inverse to go back in time (ProseMirror implements selective undo,
which is more complicated than just rolling back to a previous state).

The [collaborative
editing](http://marijnhaverbeke.nl/blog/collaborative-editing.html)
system sends these steps to other editors and reorders them if
necessary so that everyone ends up with the same document.

More generally, it is very useful for editor plugins to be able to
inspect and react to each change as it comes in, in order to keep
their own state consistent with the rest of the editor state.

## Steps

Updates to documents are decomposed into [steps](##transform.Step)
that describe an update. You usually don't need to work with these
directly, but it is useful to know how they work.

Examples of steps are [`ReplaceStep`](##transform.ReplaceStep) to
replace a piece of a document, or
[`AddMarkStep`](##transform.AddMarkStep) to add a mark to a given
range.

A step can be [applied](##transform.Step.apply) to a document to
produce a new document.

```javascript
console.log(myDoc.toString()) // → p("hello")
// A step that deletes the content between positions 3 and 5
let step = new ReplaceStep(3, 5, Slice.empty)
let result = step.apply(myDoc)
console.log(result.doc.toString()) → p("heo")
```

Applying a step is a relatively straightforward process—it doesn't do
anything clever like inserting nodes to preserve schema constraints,
or transforming the slice to make it fit. That means applying a step
can fail, for example if you try to delete just the opening token of a
node, that would leave the tokens unbalanced, which isn't a meaningful
thing you can do. This is why [`apply`](##transform.Step.apply)
returns a [result object](##transform.StepResult), which holds either
a new document, _or_ an error message.

You'll usually want to let [helper
functions](##transform.Transform.replace) generate your steps for you,
so that you don't have to worry about the details.

## Transforms

An editing action may produce one or more steps. The most convenient
way to work with a sequence of steps is to create a [`Transform`
object](##transform.Transform) (or, if you're working with a full
editor state, a [`Transaction`](##state.Transaction), which is a
subclass of `Transform`).

```javascript
let tr = new Transform(myDoc)
tr.delete(5, 7) // Delete between position 5 and 7
tr.split(5)     // Split the parent node at position 5
console.log(tr.doc.toString()) // The modified document
console.log(tr.steps.length)   // → 2
```

Most transform methods return the transform itself, for convenient
chaining (allowing you to do `tr.delete(5, 7).split(5)`).

There are transform methods methods for
[deleting](##transform.Transform.delete) and
[replacing](##transform.Transform.replace), for
[adding](##transform.Transform.addMark) and [removing
marks](##transform.Transform.removeMark), for performing tree
manipulation like [splitting](##transform.Transform.split),
[joining](##transform.Transform.join),
[lifting](##transform.Transform.lift), and
[wrapping](##transform.Transform.wrap), and more.

## Mapping

When you make a change to a document, positions pointing into that
document may become invalid or change meaning. For example, if you
insert a character, all positions after that character now point one
token before their old position. Similarly, if you delete all the
content in a document, all positions pointing into that content are
now invalid.

We often do need to preserve positions across document changes, for
example the selection boundaries. To help with this, steps can give
you a [_map_](##transform.StepMap) that can convert between positions
in the document before and after applying the step.

```javascript
let step = new ReplaceStep(4, 6, Slice.empty) // Delete 4-5
let map = step.getMap()
console.log(map.map(8)) // → 6
console.log(map.map(2)) // → 2 (nothing changes before the change)
```

Transform objects automatically
[accumulate](##transform.Transform.mapping) a set of maps for the
steps in them, using an abstraction called
[`Mapping`](##transform.Mapping), which collects a series of step maps
and allows you to map through them in one go.

```javascript
let tr = new Transaction(myDoc)
tr.split(10)    // split a node, +2 tokens at 10
tr.delete(2, 5) // -3 tokens at 2
console.log(tr.mapping.map(15)) // → 14
console.log(tr.mapping.map(6))  // → 3
console.log(tr.mapping.map(10)) // → 9
```

There are cases where it's not entirely clear what a given position
should be mapped to. Consider the last line of the example above.
Position 10 points precisely at the point where we split a node,
inserting two tokens. Should it be mapped to the position _after_ the
inserted content, or stay in front of it? In the example, it is
apparently moved after the inserted tokens.

But sometimes you want the other behavior, which is why the [`map`
method](##transform.Mapping.map) on step maps and mappings accepts a
second parameter, `bias`, which you can set to -1 to keep your
position in place when content is inserted on top of it.

```javascript
console.log(tr.mapping.map(10, -1)) // → 7
```

The reason that individual steps are defined as small, straightforward
things is that it makes this kind of mapping possible, along with
[inverting](##transform.Step.invert) steps in a lossless way, and
mapping steps through each other's position maps.

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

    stepA(doc) = docA
    stepB(doc) = docB
    stepB(docA) = MISMATCH!
    rebase(stepB, mapA) = stepB'
    stepB'(docA) = docAB

Steps have a [`map` method](##transform.Step.map), which, given a
mapping, maps the whole step through it. This can fail, since some
steps don't make sense anymore when, for example, the content they
applied to has been deleted. But when it succeeds, you now have a step
pointing into a new document, i.e. the one after the changes that you
mapped through. So in the above example, `rebase(stepB, mapA)` can
simply call `stepB.map(mapA)`.

Things get more complicated when you want to rebase a chain of steps
over another chain of steps.

    stepA2(stepA1(doc)) = docA
    stepB2(stepB1(doc)) = docB
    ???(docA) = docAB

We can map `stepB1` over `stepA1` and then `stepA2`, to get `stepB1'`.
But with `stepB2`, which starts at the document produced by
`stepB1(doc)`, and whose mapped version must apply to the document
produced by `stepB1'(docA)`, things get more difficult. It must be
mapped over the following chain of maps:

    rebase(stepB2, [invert(mapB1), mapA1, mapA2, mapB1'])

I.e. first the inverse of the map for `stepB1` to get back to the
original document, then through the pipeline of maps produced by
applying `stepA1` and `stepA2`, and finally through the map produced
by applying `stepB1'` to `docA`.

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

Even if you have rebased a step, there is no guarantee that it can
still be validly applied to the current document. For example, if your
step adds a mark, but another step changed the parent node of your
target content to be a node that doesn't allow marks, trying to apply
your step will fail. The appropriate response to this is usually just
to drop the step.
