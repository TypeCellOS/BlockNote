# Stepper Block

Numbered steps built on the container block API. `stepper` is a container
restricted to `step` children, and `step` is a `placeable: "namedOnly"`
container, so a step can only exist inside a stepper.

Each step holds any blocks: headings, lists, code. The numbers are a CSS
counter, so they stay correct as steps are added, removed, reordered or
undone. Nothing in the document has to be kept in sync.

**Add step** below the last step adds an untitled one.

## Things worth knowing

**Enter starts the next step.** By default, Enter on an empty block at the end
of a step moves that block out below the whole stepper, so the keyboard alone
cannot start a new step. `enterStartsNextStep` makes Enter work the way it does
in a list:

1. Enter at the end of a step adds a block to that step.
2. Enter again, on the empty block, starts the next step and puts the caret
   in its title.
3. Enter again, on the empty title, leaves the stepper. It leaves a paragraph
   behind, not the empty heading the step was created with.

Keyboard shortcuts are the one thing the editor API cannot provide, so this
is written as an extension, passed as the third argument of
`createReactBlockSpec`.

## Known limitations

**The title is not enforced.** A step has no text of its own: its title is
simply its first child, a heading. The user can turn that heading into any
other block, delete it, or put blocks above it. A real title needs a block
with its own text that may only appear inside a stepper, and the container API
cannot express that yet: `placeable: "namedOnly"` requires a container (a
block without content), and `children.allow` can only name containers.

**A step with an empty paragraph as title is removed.** BlockNote treats a
container child that holds only an empty paragraph as emptied out. It deletes
that child the next time it repairs the stepper, for example when any other
step is removed. New steps start with an empty heading, because a heading is
the right block for a title, and an empty heading does not count as empty. But
a step whose title the user turns into an empty paragraph is removed.

## What the container API gives you for free

- Backspace at the start of a step's title first turns it into a paragraph.
  A second Backspace moves it to the end of the previous step, or above the
  stepper if it is in the first step.
- Emptying a step drops it. Deleting the last step removes the stepper.
- Shift-Tab unnests inside a step and stops at the step's edge.

**Relevant Docs:**

- [Container Blocks](/docs/features/custom-schemas/container-blocks)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
