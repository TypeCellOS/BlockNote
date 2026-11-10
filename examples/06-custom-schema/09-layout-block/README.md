# Layout Block

In this example, we create a custom `Panel` block that holds other blocks as its body, such as a panel containing headings and paragraphs.

The block sets `layoutOnly: true` on `BlockConfig`, which makes it a layout block: it has no content of its own, only child blocks. It draws its box in `renderFrame`, and its child blocks go where `slotRef` is attached. At runtime, they are in `block.children`.

We also wire up a Slash Menu item to insert the panel.

**Try it out:**

- Press the "/" key inside the panel's body and add a code block, heading, or list.
- Insert a new panel via the Slash Menu (search "panel").

**Relevant Docs:**

- [Layout Blocks](/docs/features/custom-schemas/layout-blocks)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
