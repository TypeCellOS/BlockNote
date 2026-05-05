# Multi-Slot Alert Block

In this example, we create a custom `Alert` block whose content is a
**combinator content schema** — a record of two inline regions, `title` and
`body`. The block JSON exposes both slots as named keys, and the editor
displays the document's JSON live so you can see the resulting shape.

This is the same alert idea as `01-alert-block`, but with a richer content
shape: where the simple alert has a single inline region, this one has two
independently editable regions stored as named slots in the JSON.

```ts
const alertContentType = combinatorContentType(
  "alert",
  c.record({
    title: c.inline(),
    body: c.inline(),
  }),
);
```

The block's content JSON is automatically derived from the schema:

```json
{
  "type": "alert",
  "props": { "variant": "warning" },
  "content": {
    "title": [{ "type": "text", "text": "Heads up", "styles": {} }],
    "body":  [{ "type": "text", "text": "Be careful.", "styles": {} }]
  }
}
```

**Try it out:** click the icon to change the alert variant, and edit the title
and body inline. Watch the JSON panel below update in real time.

**Relevant Docs:**

- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
