# Configuring Portal Targets per Element

By default, BlockNote's floating UI elements (formatting toolbar, slash menu, table handles, etc.) mount inside the editor's `bn-container` element. The `portalElements` prop lets you change that — globally via `default`, or per element by key.

In this example we deliberately wrap the editor in a small parent with `overflow: hidden` so the global default of `bn-container` would clip the slash menu and the formatting toolbar. We escape only those two to `document.body`, while keeping `tableHandles` inside `.bn-container` so the table handles can never escape the editor's visual boundary.

```tsx
<BlockNoteView
  editor={editor}
  portalElements={{
    slashMenu: document.body,
    formattingToolbar: document.body,
    tableHandles: ".bn-container",
  }}
/>
```

**Relevant Docs:**

- [UI Components](/docs/react/components)
