# Container Block

In this example, we create a custom `Panel` block that holds other blocks as its body, such as a panel containing headings and paragraphs.

The block declares the `children` config on `BlockConfig`. `children: { allow: "blocks" }` makes it a container: its child blocks mount into the rendered content region (attached with `ref={contentRef}`), and live on `block.children` at runtime. A pure container like this draws its box in `render`, which re-renders live when props change.

We also wire up a Slash Menu item to insert the panel.

**Try it out:**

- Press the "/" key inside the panel's body and add a code block, heading, or list.
- Insert a new panel via the Slash Menu (search "panel").

**Relevant Docs:**

- [Container Blocks](/docs/features/custom-schemas/container-blocks)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
