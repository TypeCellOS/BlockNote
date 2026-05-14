# Tab Group Block

The motivating example for the combinator content schema design — a tab
group that combines all three variable-shape combinators:

```ts
const tabsContentType = combinatorContentType(
  "tabs",
  c.list(
    c.props(
      { label: { default: "Tab" } },
      c.blocks(),
    ),
  ),
);
```

- `c.list` — variable-arity sequence of items
- `c.props` — each item carries its own typed `label` attribute
- `c.blocks` — each tab body is a stretch of full editor blocks

The block's JSON `content` shape is automatically derived from the schema:

```json
[
  {
    "props": { "label": "Overview" },
    "content": [
      { "type": "heading", "props": { "level": 3 }, "content": [...] },
      { "type": "paragraph", "content": [...] }
    ]
  },
  {
    "props": { "label": "Details" },
    "content": [...]
  }
]
```

**Try it:**

- Click a tab label to switch tabs (React state controls visibility; the
  underlying ProseMirror document holds all tabs).
- Click "+ Add tab" to grow the list.
- Edit the label by clicking it; press Enter to commit.
- Inside a tab body, hit `/` for the slash menu, or just type — any block the
  editor knows about can live inside a tab body.

**Relevant Docs:**

- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
