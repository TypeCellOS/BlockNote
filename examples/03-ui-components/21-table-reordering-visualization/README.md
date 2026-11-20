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

## How It Works

Everything here is CSS - no additional extensions or event handling.
BlockNote's `TableHandlesExtension` owns the whole drag lifecycle and
exposes it through classes you can target:

| Class                      | What it's on                                   |
| -------------------------- | ---------------------------------------------- |
| `bn-table-drag-source-row` | every cell of the row being dragged            |
| `bn-table-drag-source-col` | every cell of the column being dragged         |
| `bn-table-drop-cursor`     | a bar on the edge the row/column would drop at |
| `bn-table-drag-preview`    | the snapshot shown next to the cursor          |

The first three are ProseMirror decorations inside the editor, so they're
scoped under `.bn-editor [data-content-type="table"]` like any other table
style. The snapshot lives outside the live editor, but copies its DOM styling
context, so those same table styles apply to it. Its outer wrapper also carries
`bn-table-drag-preview` for preview-specific overrides. The source tint uses
`--bn-table-drag-source-color` so it layers over existing cell backgrounds.

`tableStyles.css` does the restyling; `App.tsx` provides an initial table with
`headerRows: 1` so the header styling is visible right away.

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
