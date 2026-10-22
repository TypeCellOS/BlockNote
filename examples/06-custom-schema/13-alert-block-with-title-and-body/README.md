# Alert Block with Title and Body

In this example, we extend the [`Alert` block](/examples/custom-schema/alert-block) with a title and a body: the alert's text is its title, and its child blocks are the body.

The block has `content: "inline"`, so the title is ordinary inline content: formatting, links, and multiplayer cursors all work. Its child blocks are in `block.children` at runtime. `render` draws the title row, the same as in the Alert example, and `renderFrame` draws the alert's box around the title and the body together. Its `experimental_keyboard` settings keep the body inside the alert: Enter in the title adds a first child block, Shift-Tab doesn't move child blocks out, and Enter in an empty last child block leaves the alert.

**Try it out:**

- Click the icon to change the alert type.
- Press Enter at the end of the alert's title to add a block to its body.
- Press Enter in an empty last block of the body to leave the alert.
- Press Backspace at the start of the first block in the body to merge it back into the title.
- Press "/" in the body and add a code block, heading, or list.

**Relevant Docs:**

- [Minimal Alert Block Example](/examples/custom-schema/alert-block)
- [Alert Block with Full UX](/examples/custom-schema/alert-block-full-ux)
- [Block Frames](/docs/features/custom-schemas/custom-blocks#block-frames)
- [Layout Blocks and Block Frames](/docs/features/custom-schemas/layout-blocks#layout-blocks-and-block-frames)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
