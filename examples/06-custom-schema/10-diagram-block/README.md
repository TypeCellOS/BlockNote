# Diagram Block

In this example, we register the `@blocknote/diagram-block` block in a custom schema. The block renders diagrams from [Mermaid](https://mermaid.js.org/) source code, showing the rendered diagram in place of the source and revealing an editable source popup when selected - built from the same `SourceBlockWithPreview` component the math block uses, so the block itself is only a few dozen lines.

**Try it out:** Click a diagram to edit its Mermaid source!

**Relevant Docs:**

- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
