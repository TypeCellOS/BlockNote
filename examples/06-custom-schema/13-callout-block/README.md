# Callout Block with a Title and a Body

A callout is one block with two editable regions: a **title**, which is the
block's own rich text, and a **body**, which is the blocks nested under it.

Both are ordinary BlockNote content, so everything already works on them:
Enter splits the title, Tab indents inside the body, blocks can be dragged in
and out, and the whole thing serializes and pastes like any other block.

What makes them look like one box is `renderFrame`: the block returns the
markup that frames it, plus the `slot` element that BlockNote renders the
title and the body into.

**Relevant Docs:**

- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
