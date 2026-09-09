# Configuring Portal Targets

By default, BlockNote's floating components (formatting toolbar, slash menu, table handles, etc.) mount next to the editor, inside its `bn-container` (or inside whatever you render `BlockNoteViewEditor` into). The `portalElements` prop on `BlockNoteView` lets you change that: globally via `default`, or per component by key. The menus and popovers a floating component opens follow it wherever it mounts.

This example renders two editors side-by-side, both wrapped in a small `overflow: hidden` container. The left editor uses the default, so the slash menu is clipped by the editor's bounds. The right editor passes `portalElements={{ default: document.body }}` so the floating components escape the wrapper and render fully.

```tsx
<BlockNoteView editor={editor} portalElements={{ default: document.body }} />
```

**Relevant Docs:**

- [UI Components](/docs/react/components)
