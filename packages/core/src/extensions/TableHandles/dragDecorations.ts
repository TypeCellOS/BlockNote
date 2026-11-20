import type { Node, ResolvedPos } from "prosemirror-model";
import { Decoration } from "prosemirror-view";

import {
  canColumnBeDraggedInto,
  canRowBeDraggedInto,
  getCellsAtColumnHandle,
  getCellsAtRowHandle,
  getTableCellOccupancyGrid,
} from "../../api/blockManipulation/tables/tables.js";
import { DefaultBlockSchema } from "../../blocks/defaultBlocks.js";
import { BlockFromConfigNoChildren } from "../../schema/index.js";

/** Marks each cell of the row being dragged. */
export const DRAG_SOURCE_ROW_CLASS = "bn-table-drag-source-row";
/** Marks each cell of the column being dragged. */
export const DRAG_SOURCE_COL_CLASS = "bn-table-drag-source-col";
/** Marks the edge the dragged row/column would be dropped at. */
export const DROP_CURSOR_CLASS = "bn-table-drop-cursor";

const DROP_CURSOR_THICKNESS = 4;
// Mirrors the 1px cell border in editor.css.
const CELL_BORDER_WIDTH = 1;
const cursorAxes = {
  row: {
    before: "top",
    after: "bottom",
    crossStart: "left",
    crossEnd: "right",
    size: "height",
  },
  col: {
    before: "left",
    after: "right",
    crossStart: "top",
    crossEnd: "bottom",
    size: "width",
  },
} as const;

export type TableDragState = {
  draggedCellOrientation: "row" | "col";
  /**
   * The index of the row/column being dragged.
   */
  originalIndex: number;
  /**
   * The index the row/column would be dropped into, or `undefined` if the drag
   * hasn't been over the table yet.
   */
  newIndex: number | undefined;
};

/**
 * Builds the decorations shown while dragging a table row or column:
 *
 * - `bn-table-drag-source-row` / `bn-table-drag-source-col` on each cell of the
 *   row/column being dragged, so it's clear what's moving. Shown for the whole
 *   drag, including before the first `dragover` and while hovering a position
 *   the row/column can't be dropped into.
 * - `bn-table-drop-cursor` widgets marking the edge the row/column would be
 *   dropped at. Only shown once the drag is over a valid, different position.
 *
 * `tableResolvedPos` points inside the table in the current document.
 */
export function getTableDragDecorations(
  tableResolvedPos: ResolvedPos,
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  { draggedCellOrientation, originalIndex, newIndex }: TableDragState,
): Decoration[] {
  // Resolve the document path only once. Resolving every cell repeats the
  // search through blocks before this table, while posAtIndex also scans all
  // preceding rows/cells. A table-local pass gives constant-time cell lookups.
  // These are physical child indices, not TableMap's logical (span-expanded)
  // coordinates, matching the existing row/column handle helpers.
  const cellPositions: { node: Node; pos: number }[][] = [];
  tableResolvedPos.node().forEach((row, rowOffset) => {
    const cells: { node: Node; pos: number }[] = [];
    row.forEach((node, cellOffset) => {
      cells.push({
        node,
        pos: tableResolvedPos.start() + rowOffset + 1 + cellOffset,
      });
    });
    cellPositions.push(cells);
  });

  const decorations: Decoration[] = [];
  // Both helpers accept a prebuilt grid. Reuse it for the source and target
  // rather than laying out the entire (possibly merged) table twice.
  const occupancyGrid = getTableCellOccupancyGrid(block);
  const getCellsAtHandle =
    draggedCellOrientation === "row"
      ? getCellsAtRowHandle
      : getCellsAtColumnHandle;
  const canBeDraggedInto =
    draggedCellOrientation === "row"
      ? canRowBeDraggedInto
      : canColumnBeDraggedInto;

  const draggedCells = getCellsAtHandle(block, originalIndex, occupancyGrid);
  draggedCells.forEach((cell) => {
    const cellResolvedPos = cellPositions[cell.row]?.[cell.col];
    if (!cellResolvedPos) {
      return;
    }
    const cellStart = cellResolvedPos.pos;

    decorations.push(
      Decoration.node(cellStart, cellStart + cellResolvedPos.node.nodeSize, {
        class:
          draggedCellOrientation === "row"
            ? DRAG_SOURCE_ROW_CLASS
            : DRAG_SOURCE_COL_CLASS,
      }),
    );
  });

  // Only the source highlight is shown until hovering a different, valid target.
  if (newIndex === undefined || newIndex === originalIndex) {
    return decorations;
  }

  // Reuse the target cells for validation and decorations, as the occupancy
  // lookup can be expensive for large tables.
  const cellsAtNewIndex = getCellsAtHandle(block, newIndex, occupancyGrid);
  if (!canBeDraggedInto(block, originalIndex, newIndex, cellsAtNewIndex)) {
    return decorations;
  }

  cellsAtNewIndex.forEach((cell) => {
    const cellResolvedPos = cellPositions[cell.row]?.[cell.col];
    if (!cellResolvedPos) {
      return;
    }

    // Creates a decoration at the start or end of each cell, depending on
    // whether the new index is before or after the original index.
    const decorationPos =
      cellResolvedPos.pos +
      1 +
      (newIndex > originalIndex ? cellResolvedPos.node.nodeSize - 2 : 0);

    decorations.push(
      // The widget is a small bar which spans the width (for a row) or height
      // (for a column) of the cell.
      Decoration.widget(decorationPos, () => {
        const widget = document.createElement("div");
        widget.className = DROP_CURSOR_CLASS;

        const axis = cursorAxes[draggedCellOrientation];
        const after = newIndex > originalIndex;
        widget.style[axis.crossStart] = "0";
        widget.style[axis.crossEnd] = "0";
        widget.style[axis.size] = `${DROP_CURSOR_THICKNESS}px`;
        // Center the bar on the shared border; the leading edge includes the
        // cell's own border, while the trailing edge is already outside it.
        widget.style[after ? axis.after : axis.before] =
          `${-DROP_CURSOR_THICKNESS / 2 - (after ? 0 : CELL_BORDER_WIDTH)}px`;

        return widget;
      }),
    );
  });

  return decorations;
}
