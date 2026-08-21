# Container Block

In this example, we create a custom `Callout` block that holds other blocks as its body, like a Notion-style callout wrapping a paragraph followed by a code block.

The block declares the `children` config on `BlockConfig`. `children: { min: 1, default: [{ type: "paragraph" }] }` makes it a container: its child blocks mount into the element the render passes `contentRef` to, and live on `block.children` at runtime.

The callout's **title** demonstrates the complementary "string prop slot" pattern: a field that doesn't need rich text, comments, or multiplayer cursors can live in a plain string prop, edited through a regular `<input>` rendered inside the block (in a `contentEditable={false}` wrapper) and committed via `editor.updateBlock`. A field that _is_ prose belongs in the block's own `content: "inline"` instead.

We also wire up a Slash Menu item to insert the callout, and render the document JSON next to the editor so you can inspect the structure of the nested blocks.

**Try it out:**

- Press the "/" key inside the callout's body and add a code block, heading, or list.
- Type a title into the title field. It's stored on `block.props.title`, not as document content.
- Watch the JSON panel on the right update as you edit; the callout's children appear in `block.children`.
- Insert a new callout via the Slash Menu (search "callout").

**Relevant Docs:**

- [Container Blocks](/docs/features/custom-schemas/container-blocks)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
