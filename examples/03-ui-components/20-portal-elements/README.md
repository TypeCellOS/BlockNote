# Configuring Portal Targets

By default, BlockNote's floating UI elements (formatting toolbar, slash menu, table handles, etc.) mount inside the editor's `bn-container`. The `portalElements` prop on `BlockNoteView` lets you change that — globally via `default`, or per element by key.

This example renders two editors side-by-side, both wrapped in a small `overflow: hidden` container. The left editor uses the default — the slash menu is clipped by the editor's bounds. The right editor passes `portalElements={{ default: document.body }}` so floating UI escapes the wrapper and renders fully.

```tsx
<BlockNoteView
  editor={editor}
  portalElements={{ default: document.body }}
/>
```

**Relevant Docs:**

- [UI Components](/docs/react/components)
