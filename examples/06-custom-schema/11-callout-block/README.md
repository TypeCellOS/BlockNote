# Callout Block

A callout block whose content is a **sequence of editor blocks** rather than a
single rich-text region. Built with the `c.blocks` combinator:

```ts
const calloutContentType = combinatorContentType(
  "callout",
  c.blocks(),
);
```

The block's JSON `content` is automatically derived as `Block[]`:

```json
{
  "type": "callout",
  "props": { "tone": "info" },
  "content": [
    { "type": "heading", "props": { "level": 3 }, "content": [...] },
    { "type": "paragraph", "content": [...] },
    { "type": "bulletListItem", "content": [...] }
  ]
}
```

Inside the callout's body you can drop any block the editor knows about —
headings, paragraphs, lists, even other callouts. Try the slash menu (`/`)
or hit Enter to add new blocks.

**Relevant Docs:**

- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
