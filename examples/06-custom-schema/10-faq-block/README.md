# FAQ Block

A custom block whose content is a **variable-length list** of question/answer
pairs, built with the `c.list` and `c.record` combinators:

```ts
const faqContentType = combinatorContentType(
  "faq",
  c.list(
    c.record({
      question: c.inline(),
      answer: c.inline(),
    }),
  ),
);
```

The block's JSON `content` is automatically derived as an array:

```json
[
  { "question": [...], "answer": [...] },
  { "question": [...], "answer": [...] }
]
```

The example renders all FAQ items in the block's chrome and has an
**Add question** button that calls `editor.updateBlock` to append a new item
to the list — demonstrating how arbitrary list mutations work today through
the existing block-update API.

**Try it:** edit any question or answer and watch the JSON update; click
"Add question" to see the array grow.

**Relevant Docs:**

- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Editor Setup](/docs/getting-started/editor-setup)
