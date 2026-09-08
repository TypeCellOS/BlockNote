# Container Block

In this example, we create a custom `Panel` block that holds other blocks as its body, like a Notion-style callout wrapping a paragraph followed by a code block.

The block declares the `children` config on `BlockConfig`. `children: { allow: "blocks" }` makes it a container: its child blocks mount into the rendered content region (attached with `ref={contentRef}`), and live on `block.children` at runtime. A pure container like this draws its box in `render`, which re-renders live when props change — click the icon to cycle the panel's flavor and watch the box follow without rebuilding the body.

We also wire up a Slash Menu item to insert the panel, and render the document JSON next to the editor so you can inspect the structure of the nested blocks.

**Try it out:**

- Press the "/" key inside the panel's body and add a code block, heading, or list.
- Click the panel's icon to cycle its flavor. The box re-renders in place; the children are untouched.
- Watch the JSON panel on the right update as you edit; the panel's children appear in `block.children`.
- Insert a new panel via the Slash Menu (search "panel").

**Relevant Docs:**

- [Container Blocks](/docs/features/custom-schemas/container-blocks)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
