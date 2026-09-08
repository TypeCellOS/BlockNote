# Alert Blocks

In this example, we create two `Alert` variants that hold other blocks as their body. The `alert` block keeps its title as inline content with child blocks as its body (a titled block), while `alertBox` holds only child blocks (a pure container).

Both variants declare the `children` config on `BlockConfig` with `children: { allow: "blocks" }`. The titled alert additionally uses `render` for its title row and `renderFrame` for the box around the title and body together; the title-less alert uses `render`, with the children mounting straight into its `contentDOM`.

We also wire up Slash Menu items to insert each variant, and render the document JSON next to the editor so you can inspect the structure of the nested blocks.

**Try it out:**

- Press Enter at the end of the alert's title to start its body, keeping the existing body blocks in place.
- Press Backspace at the start of the first body block to merge it back into the title.
- Press "/" anywhere to insert a new Alert or Alert box, and watch the JSON panel update as you edit.

**Relevant Docs:**

- [Container Blocks](/docs/features/custom-schemas/container-blocks)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
