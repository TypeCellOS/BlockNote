# Tabs Block

A tab set built on the container block API. `tabs` is a container whose
`children` are restricted to `tab` panels, and `tab` is a `placeable:
"namedOnly"` container, so a panel can only ever exist inside a tab set —
the schema enforces both.

Each panel holds any block. A panel's label is document content and lives in
its props. Which panel is open is not: it belongs to each reader, so it is kept
outside the document, in `localStorage` keyed by the tab set's id. Switching
tabs is therefore not an undo step and is not sent to collaborators.

**Try it out:** Click a tab to open it, click the open tab for its menu, and
drag a tab to reorder it.

## What a tab set needs beyond the container API

**Revealing the panel the caret lands in.** A hidden panel is still part of the
document, so the editor will move content into it: Backspace at the start of
the block after a tab set pulls that block into the last panel, which may not
be the open one. `useRevealCaretPanel` opens whichever panel the caret ends up
in, using `editor.onSelectionChange`, so every route in (Backspace, Delete,
arrow keys, drag and drop, paste) is covered at once.

**Moving the caret when a tab is clicked.** An explicit switch takes the caret
with it when the caret was inside the set. Otherwise the reveal above would
immediately reopen the panel it was left in.

**A menu instead of buttons.** Clicking the open tab opens a menu to rename,
move or delete it. It is built from `useComponentsContext()`, so it matches
whichever UI library the editor uses.

**Drag to reorder.** Tabs are sortable with dnd-kit. A tab keeps its block id
when it moves, so the reader's open tab follows it.

## Known limitation

Emptying a panel removes it, label included, because the container repair
treats a panel holding only an empty paragraph as empty. Removing the last
non-empty panel can therefore dissolve the whole tab set. The container API
has no way for a block to opt out of this yet.

**Relevant Docs:**

- [Container Blocks](/docs/features/custom-schemas/container-blocks)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
