# Container Block

In this example, we create a custom `Callout` block that holds **other blocks** as its body — like a Notion-style callout that can wrap a paragraph followed by a code block, or any combination of nested blocks.

The block uses the new `container` config on `BlockConfig`. Setting `container: { defaultBlocks: ["paragraph"] }` (with `content: "none"`) tells BlockNote to emit a ProseMirror node that holds nested `blockContainer+` children — the same shape that columns use under the hood. The contained blocks live on `block.children` at runtime.

We also wire up a Slash Menu item to insert the callout, and render the document JSON next to the editor so you can inspect the structure of the nested blocks.

**Try it out:**

- Press the "/" key inside the callout's body and add a code block, heading, or list — anything goes.
- Watch the JSON panel on the right update as you edit; the callout's children appear in `block.children`.
- Insert a new callout via the Slash Menu (search "callout").

**Relevant Docs:**

- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
