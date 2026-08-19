import type { Node, ResolvedPos } from "prosemirror-model";
import { Decoration } from "prosemirror-view";

import {
  RelativeCellIndices,
  canColumnBeDraggedInto,
  canRowBeDraggedInto,
  getCellsAtColumnHandle,
  getCellsAtRowHandle,
} from "../../api/blockManipulation/tables/tables.js";
import { DefaultBlockSchema } from "../../blocks/defaultBlocks.js";
import { BlockFromConfigNoChildren } from "../../schema/index.js";

/** Marks each cell of the row being dragged. */
export const DRAG_SOURCE_ROW_CLASS = "bn-table-drag-source-row";
/** Marks each cell of the column being dragged. */
export const DRAG_SOURCE_COL_CLASS = "bn-table-drag-source-col";
/** Marks the edge the dragged row/column would be dropped at. */
export const DROP_CURSOR_CLASS = "bn-table-drop-cursor";

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
 * Returns an empty array if the table can't be resolved at `tablePos`.
 */
export function getTableDragDecorations(
  doc: Node,
  /**
   * Position just before the table node, i.e. `TableHandlesView`'s `tablePos`.
   */
  tablePos: number,
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  { draggedCellOrientation, originalIndex, newIndex }: TableDragState,
): Decoration[] {
  // `tablePos` is only updated on mousemove, and mousemove doesn't fire during
  // a native drag - so a transaction which shifts or removes the table mid-drag
  // (a concurrent local or collaborative edit) leaves it stale. Resolving a
  // stale position throws, which would take down the whole view update, so drop
  // the decorations instead.
  let tableResolvedPos: ResolvedPos;
  try {
    tableResolvedPos = doc.resolve(tablePos + 1);
  } catch {
    return [];
  }
  if (tableResolvedPos.node().type.name !== "table") {
    return [];
  }

  // Resolves the relative indices returned by `getCellsAtRowHandle` /
  // `getCellsAtColumnHandle` to a position inside that cell.
  const resolveCell = ({ row, col }: RelativeCellIndices) => {
    // Gets each row in the table.
    const rowResolvedPos = doc.resolve(tableResolvedPos.posAtIndex(row) + 1);

    // Gets the cell within the row.
    return doc.resolve(rowResolvedPos.posAtIndex(col) + 1);
  };

  const decorations: Decoration[] = [];

  const draggedCells =
    draggedCellOrientation === "row"
      ? getCellsAtRowHandle(block, originalIndex)
      : getCellsAtColumnHandle(block, originalIndex);

  draggedCells.forEach((cell) => {
    const cellResolvedPos = resolveCell(cell);
    const cellStart = cellResolvedPos.before();

    decorations.push(
      Decoration.node(cellStart, cellStart + cellResolvedPos.node().nodeSize, {
        class:
          draggedCellOrientation === "row"
            ? DRAG_SOURCE_ROW_CLASS
            : DRAG_SOURCE_COL_CLASS,
      }),
    );
  });

  // Only the source highlight is shown if:
  // - The drag hasn't been over the table yet
  // - Dragging to the same position
  // - Row drag not allowed
  // - Column drag not allowed
  if (
    newIndex === undefined ||
    newIndex === originalIndex ||
    (draggedCellOrientation === "row" &&
      !canRowBeDraggedInto(block, originalIndex, newIndex)) ||
    (draggedCellOrientation === "col" &&
      !canColumnBeDraggedInto(block, originalIndex, newIndex))
  ) {
    return decorations;
  }

  const cellsAtNewIndex =
    draggedCellOrientation === "row"
      ? getCellsAtRowHandle(block, newIndex)
      : getCellsAtColumnHandle(block, newIndex);

  cellsAtNewIndex.forEach((cell) => {
    const cellResolvedPos = resolveCell(cell);

    // Creates a decoration at the start or end of each cell, depending on
    // whether the new index is before or after the original index.
    const decorationPos =
      cellResolvedPos.pos +
      (newIndex > originalIndex ? cellResolvedPos.node().nodeSize - 2 : 0);

    decorations.push(
      // The widget is a small bar which spans the width (for a row) or height
      // (for a column) of the cell.
      Decoration.widget(decorationPos, () => {
        const widget = document.createElement("div");
        widget.className = DROP_CURSOR_CLASS;

        // The offsets below are only necessary because the drop indicator's
        // size is an even number of pixels, whereas the border between table
        // cells is an odd number of pixels. So this makes the positioning
        // slightly more consistent regardless of where the row/column is being
        // dropped.
        if (draggedCellOrientation === "row") {
          widget.style.left = "0";
          widget.style.right = "0";
          if (newIndex > originalIndex) {
            widget.style.bottom = "-2px";
          } else {
            widget.style.top = "-3px";
          }
          widget.style.height = "4px";
        } else {
          widget.style.top = "0";
          widget.style.bottom = "0";
          if (newIndex > originalIndex) {
            widget.style.right = "-2px";
          } else {
            widget.style.left = "-3px";
          }
          widget.style.width = "4px";
        }

        return widget;
      }),
    );
  });

  return decorations;
}
