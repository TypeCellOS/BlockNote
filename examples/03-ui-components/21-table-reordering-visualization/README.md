# Table Reordering Visualization

This example gives dragging a table row/column much clearer visual feedback
than BlockNote's default, matching the feel of tools like Microsoft Loop:

- **Restyled tables**: rounded card look, muted header row, hairline
  borders, and a row-hover highlight instead of a harsh black grid.
- **Drag source highlight**: the row/column actually being dragged is
  tinted and outlined so it's obvious what's moving.
- **Colored drop indicator**: the drop-position line uses a solid brand
  color instead of the default pale blue.
- **Floating drag image**: a real snapshot of the row/column follows the
  cursor while dragging, instead of BlockNote's default (invisible) native
  drag image.
- **Header row by default**: the `/table` command starts new tables with
  a header row already enabled, so the header styling is visible right away.

## Interaction Model

Nothing here changes _what_ a row/column drag does - BlockNote's own
`TableHandlesExtension` still owns the drag lifecycle (`dragstart` /
`dragover` / `drop`) and the actual reorder (`moveRow` / `moveColumn` +
`editor.updateBlock`). This example only adds feedback layered on top of
that existing lifecycle:

1. **Drag start** - `TableDragSourceExtension` reads the same
   `tableHandlesPluginKey` transaction metadata BlockNote's own drop-cursor
   decoration reads, and paints a ProseMirror node decoration on the
   row/column being dragged. `useTableDragImage` builds a cloned snapshot of
   that same row/column and swaps it in as the native drag image via
   `DataTransfer.setDragImage`.
2. **Drag over** - BlockNote's existing drop-cursor decoration renders as
   normal (just recolored via CSS); the source decoration stays as the drag
   continues, since it's keyed off the drag's _original_ index, not the
   current hover target.
3. **Drop / dragend** - BlockNote clears its `draggingState` and dispatches
   the move as a normal transaction either way. Because the source
   decoration is derived from that same state, it disappears the instant
   `draggingState` is cleared - on a successful drop **and** on a cancelled
   drag (e.g. `Escape`), since both go through `dragEnd()` set to `undefined`/`null`.

## Known Limitations

- **Keyboard and touch**: BlockNote's table drag handles are
  `draggable` + `onDragStart` only today (see `TableHandle.tsx`) - there's no
  keyboard-operable reorder path, and native HTML5 drag-and-drop isn't
  supported on touch browsers at all. Both are pre-existing gaps in
  BlockNote's table-drag feature as a whole, not something this example
  introduces or fixes - building either would be a separate, larger feature
  for BlockNote's core drag system.
- **Accessibility**: for the same reason, there's no keyboard focus
  restoration to verify after a reorder - the interaction can't be reached
  by keyboard in the first place yet.
- **Merged cells**: the source-highlight decoration resolves cells by plain
  row/column index, which doesn't account for `colspan`/`rowspan` shifting
  indices. In practice BlockNote's own `canRowBeDraggedInto` /
  `canColumnBeDraggedInto` guards already block most drags across a merged
  cell, so this mainly affects highlighting fidelity in edge cases, not
  document correctness - see the "merged (rowspan) cell" test.
- **Concurrent edits mid-drag**: BlockNote's `dropHandler` snapshots the
  table's content once at drag-start and doesn't refresh it while the drag
  is in progress (only `mousemove`, which stops firing on the dragged-over
  element during a native drag, triggers a refresh). If another
  collaborator edits the same table while a drag is in progress, the drop
  can overwrite their change with the pre-drag snapshot. This is existing
  BlockNote core behavior this example doesn't touch or change.

## Tests

`tests/src/end-to-end/tables/tableReorderingVisualization.test.tsx` covers
the parts this example actually adds: source-highlight + drop-cursor
appearance during a drag, per-cell tinting for column drags, cleanup on a
cancelled drag, dragging a row with rich (bold) inline content, dragging a
column across a merged cell, and the `/table` header-row default. It
doesn't re-test BlockNote's own move/reorder logic, which is already
covered by `tables.test.tsx`.

## How It Works

- `tableDragSourceExtension.ts` adds a small ProseMirror plugin that reads
  the same transaction metadata BlockNote's own `TableHandlesExtension`
  uses for its drop-cursor, and applies a node decoration to the row/column
  being dragged _from_. Using a decoration (not a direct DOM class mutation)
  matters: ProseMirror's table view can redraw independently of React, and
  a plain DOM mutation gets silently discarded on the next redraw.
- `useTableDragImage.ts` swaps BlockNote's hidden 1x1 native drag image for
  a cloned snapshot of the row/column, styled like a lifted card, via the
  standard `DataTransfer.setDragImage` API.
- `tableStyles.css` restyles the table itself and the drop-cursor color.
- `App.tsx` overrides the default `/table` slash-menu item so new tables
  start with `headerRows: 1`.

**Relevant Docs:**

- [Tables](/docs/features/blocks/tables)
- [Editor Setup](/docs/getting-started/editor-setup)
- [Slash Menu](/docs/react/components/suggestion-menus)
