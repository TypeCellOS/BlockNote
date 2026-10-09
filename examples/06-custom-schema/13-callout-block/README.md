# Callout Block

In this example, we create a custom `Callout` block with a real rich-text title and child blocks inside it (a titled block), like a Notion-style callout.

The block has `content: "inline"`: the title is ordinary inline content — formatting, links, and multiplayer cursors all work — and its child blocks live on `block.children` at runtime. Its `keyboard` settings keep the child blocks inside the callout: Enter in the title adds a first child block, Shift-Tab doesn't move child blocks out, and Enter in an empty last child block leaves the callout. `render` draws the title row and `renderFrame` draws the box around the title and child blocks together.

We also wire up a Slash Menu item to insert the callout.

**Try it out:**

- Press Enter at the end of the callout's title to add a block inside the callout.
- Press Enter in an empty last block inside the callout to leave the callout.
- Press Backspace at the start of the first block inside the callout to merge it back into the title.
- Press "/" inside the callout and add a code block, heading, or list.

**Relevant Docs:**

- [Container Blocks](/docs/features/custom-schemas/container-blocks)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
