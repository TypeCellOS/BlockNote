# Stepper Block

Numbered steps built on the layout block API. `stepper` is a layout block
restricted to `step` children, and `step` is a `placeable: "namedOnly"`
layout block, so a step can only exist inside a stepper.

Each step holds any blocks: headings, lists, code. The numbers are a CSS
counter, so they stay correct as steps are added, removed, reordered or
undone. Nothing in the document has to be kept in sync.

**Add step** below the last step adds an untitled one.

Both blocks are layout blocks (`layoutOnly: true`), so they declare only
`renderFrame`, and the child blocks go where `slotRef` is attached. A step can
only be inside a stepper, so it gets no drag handle by default. The step sets
`meta: { draggable: true }` to keep it, so the side menu can move or delete a
step.

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

The block's `experimental_keyboard` settings cannot insert a new step, so this
is written as an extension, passed as the third argument of
`createReactBlockSpec`.

## Known limitations

**The title is not enforced.** A step has no text of its own: its title is
simply its first child, a heading. The user can turn that heading into any
other block, delete it, or put blocks above it. A real title needs a block
with its own text that may only appear inside a stepper, and the layout block API
cannot express that yet: `placeable: "namedOnly"` requires a layout block (a
block without content), and `children.allow` can only name layout blocks.

**Empty steps stay.** The stepper sets `children.dissolve` to `false`, so a
step that holds only an empty paragraph is not removed, and the stepper stays
when its last step is removed.

## What the layout block API gives you for free

- Backspace at the start of a step's title first turns it into a paragraph.
  A second Backspace moves it to the end of the previous step, or above the
  stepper if it is in the first step.
- Emptying a step drops it. Deleting the last step removes the stepper.
- Shift-Tab unnests inside a step and stops at the step's edge.

**Relevant Docs:**

- [Layout Blocks](/docs/features/custom-schemas/layout-blocks)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
