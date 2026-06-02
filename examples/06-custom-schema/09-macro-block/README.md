# Macro Block

In this example, we create a custom `Macro` block using the vanilla `createBlockSpec` API from `@blocknote/core`. Each macro block stores an `id` prop, and the `id` is used to look up "before" and "after" HTML strings in a global map. Those strings are injected as html on either side of the editable inline content.

This pattern is useful when you want a block whose decoration is driven by a runtime registry — for example, server-driven labels, citations, or templated wrappers.

**Try it out:** Edit the inline text inside each macro block. Notice that the "before" and "after" decorations stay non-editable, and that swapping the `id` in `App.tsx` would change the surrounding HTML without touching the block's content.

**Relevant Docs:**

- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
