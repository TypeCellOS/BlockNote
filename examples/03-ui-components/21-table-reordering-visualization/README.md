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
