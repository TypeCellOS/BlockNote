# Table Reordering Visualization

BlockNote gives table row/column dragging visual feedback out of the box: a
snapshot of the row/column follows the cursor, the row/column being dragged is
tinted and outlined, and a drop indicator marks where it would land.

This example shows how to restyle a table - and those built-in drag
affordances - to match your own product, using a Microsoft Loop-inspired look:

- **Restyled tables**: rounded card look, muted header row, hairline
  borders, and a row-hover highlight instead of a harsh black grid.
- **Retuned drag affordances**: the built-in drag source highlight, drop
  indicator and drag snapshot recolored to the same palette.
- **Header row by default**: the `/table` command starts new tables with
  a header row already enabled, so the header styling is visible right away.

## How It Works

Everything here is CSS plus one slash-menu tweak - no extensions, no event
handling. BlockNote's `TableHandlesExtension` owns the whole drag lifecycle and
exposes it through classes you can target:

| Class                      | What it's on                                   |
| -------------------------- | ---------------------------------------------- |
| `bn-table-drag-source-row` | every cell of the row being dragged            |
| `bn-table-drag-source-col` | every cell of the column being dragged         |
| `bn-table-drop-cursor`     | a bar on the edge the row/column would drop at |
| `bn-table-drag-preview`    | the snapshot shown next to the cursor          |

The first three are ProseMirror decorations inside the editor, so they're
scoped under `.bn-editor [data-content-type="table"]` like any other table
style. `bn-table-drag-preview` is different: it's appended outside the editor
(the browser can only use an attached element as a drag image), so it has to be
styled through its own class rather than through the table selectors.

`tableStyles.css` does the restyling; `App.tsx` overrides the default `/table`
slash-menu item so new tables start with `headerRows: 1`.

## Known Limitations

- **Keyboard and touch**: BlockNote's table drag handles are `draggable` +
  `onDragStart` only today (see `TableHandle.tsx`) - there's no
  keyboard-operable reorder path, and native HTML5 drag-and-drop isn't
  supported on touch browsers at all. Both are gaps in BlockNote's table-drag
  feature as a whole, not something this example introduces or fixes.
- **Accessibility**: for the same reason, there's no keyboard focus
  restoration to verify after a reorder - the interaction can't be reached by
  keyboard in the first place yet.

**Relevant Docs:**

- [Tables](/docs/features/blocks/tables)
- [Overriding CSS](/docs/react/styling-theming/overriding-css)
- [Editor Setup](/docs/getting-started/editor-setup)
- [Slash Menu](/docs/react/components/suggestion-menus)
