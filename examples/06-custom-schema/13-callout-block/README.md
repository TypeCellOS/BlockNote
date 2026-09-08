# Callout Block

In this example, we create a custom `Callout` block with a real rich-text title and a body of child blocks (a titled block), like a Notion-style callout.

The block combines `content: "inline"` with the `children` config on `BlockConfig`. The title is ordinary inline content — formatting, links, and multiplayer cursors all work — while `children: { allow: "blocks" }` hosts the body blocks, which live on `block.children` at runtime. `render` draws the title row and `renderFrame` draws the box around the title and body together.

We also wire up a Slash Menu item to insert the callout, and render the document JSON next to the editor so you can inspect the structure of the titled block and its nested children.

**Try it out:**

- Press Enter at the end of the callout's title to jump into its body.
- Press Backspace at the start of the first body block to merge it back into the title.
- Press "/" inside the body and add a code block, heading, or list.
- Watch the JSON panel on the right update as you edit; the title is `content` and the body is `block.children`.

**Relevant Docs:**

- [Container Blocks](/docs/features/custom-schemas/container-blocks)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
