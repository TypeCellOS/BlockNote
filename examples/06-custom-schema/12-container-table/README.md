# Table Built From Container Blocks

In this example, we rebuild BlockNote's table as four container blocks: `table`, `tableRow`, `tableCell`, and `tableHeader`. There is no `prosemirror-tables` and no special `"table"` content type. A table is a container of rows, a row is a container of cells, and a cell is a container of arbitrary blocks, so cells can hold lists, headings, images, or even nested tables. The JSON shape is the same `children` array every other block uses.

Cells declare `boundary: "sealed"`, which makes them behave like compartments: Backspace, Delete, and arrow keys never implicitly move content or the caret across a cell's edge, and Enter adds another block _inside_ the cell. Header cells are a distinct block type rather than table metadata, so toggling the header row is just `updateBlock` with a new type. All structural operations, from adding and removing rows and columns to Tab-to-next-cell, are plain calls to the public block manipulation API: `insertBlocks`, `removeBlocks`, `updateBlock`, `getParentBlock`, and `setTextCursorPosition`.

**Try it out:**

- Press Tab / Shift-Tab to move between cells. Tab in the last cell adds a new row.
- Press Enter inside a cell to stack more blocks in it, or "/" to add a list or heading.
- Hover the table to reveal the row/column controls, and watch the JSON panel update.

**Relevant Docs:**

- [Container Blocks](/docs/features/custom-schemas/container-blocks)
- [Custom Blocks](/docs/features/custom-schemas/custom-blocks)
- [Manipulating Blocks](/docs/reference/editor/manipulating-content)
- [Editor Setup](/docs/getting-started/editor-setup)
