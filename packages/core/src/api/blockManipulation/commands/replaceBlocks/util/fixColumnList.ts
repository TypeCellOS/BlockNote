import { Slice, type Node } from "prosemirror-model";
import { type Transaction } from "prosemirror-state";
import { ReplaceAroundStep } from "prosemirror-transform";

/**
 * Checks if a `column` node is empty, i.e. if it has only a single empty
 * block.
 * @param column The column to check.
 * @returns Whether the column is empty.
 */
export function isEmptyColumn(column: Node) {
  if (!column || column.type.name !== "column") {
    throw new Error("Invalid columnPos: does not point to column node.");
  }

  const blockContainer = column.firstChild;
  if (!blockContainer) {
    throw new Error("Invalid column: does not have child node.");
  }

  const blockContent = blockContainer.firstChild;
  if (!blockContent) {
    throw new Error("Invalid blockContainer: does not have child node.");
  }

  return (
    column.childCount === 1 &&
    blockContainer.childCount === 1 &&
    blockContent.type.spec.content === "inline*" &&
    blockContent.content.content.length === 0
  );
}

/**
 * Removes all empty `column` nodes in a `columnList`. A `column` node is empty
 * if it has only a single empty block. If, however, removing the `column`s
 * leaves the `columnList` that has fewer than two, ProseMirror will re-add
 * empty columns.
 * @param tr The `Transaction` to add the changes to.
 * @param columnListPos The position just before the `columnList` node.
 */
export function removeEmptyColumns(tr: Transaction, columnListPos: number) {
  const $columnListPos = tr.doc.resolve(columnListPos);
  const columnList = $columnListPos.nodeAfter;
  if (!columnList || columnList.type.name !== "columnList") {
    throw new Error(
      "Invalid columnListPos: does not point to columnList node.",
    );
  }

  for (
    let columnIndex = columnList.childCount - 1;
    columnIndex >= 0;
    columnIndex--
  ) {
    const columnPos = tr.doc
      .resolve($columnListPos.pos + 1)
      .posAtIndex(columnIndex);
    const $columnPos = tr.doc.resolve(columnPos);
    const column = $columnPos.nodeAfter;
    if (!column || column.type.name !== "column") {
      throw new Error("Invalid columnPos: does not point to column node.");
    }

    if (isEmptyColumn(column)) {
      tr.delete(columnPos, columnPos + column?.nodeSize);
    }
  }
}

/**
 * Fixes potential issues in a `columnList` node after a
 * `blockContainer`/`column` node is (re)moved from it:
 *
 * - Removes all empty `column` nodes. A `column` node is empty if it has only
 * a single empty block.
 * - If all but one `column` nodes are empty, replaces the `columnList` with
 * the content of the non-empty `column`.
 * - If all `column` nodes are empty, removes the `columnList` entirely.
 * @param tr The `Transaction` to add the changes to.
 * @param columnListPos
 * @returns The position just before the `columnList` node.
 */
export function fixColumnList(tr: Transaction, columnListPos: number) {
  removeEmptyColumns(tr, columnListPos);

  const $columnListPos = tr.doc.resolve(columnListPos);
  const columnList = $columnListPos.nodeAfter;
  if (!columnList || columnList.type.name !== "columnList") {
    throw new Error(
      "Invalid columnListPos: does not point to columnList node.",
    );
  }

  if (columnList.childCount > 2) {
    // Do nothing if the `columnList` has at least two non-empty `column`s.
    return;
  }

  if (columnList.childCount < 2) {
    throw new Error("Invalid columnList: contains fewer than two children.");
  }

  const firstColumnBeforePos = columnListPos + 1;
  const $firstColumnBeforePos = tr.doc.resolve(firstColumnBeforePos);
  const firstColumn = $firstColumnBeforePos.nodeAfter;

  const lastColumnAfterPos = columnListPos + columnList.nodeSize - 1;
  const $lastColumnAfterPos = tr.doc.resolve(lastColumnAfterPos);
  const lastColumn = $lastColumnAfterPos.nodeBefore;

  if (!firstColumn || !lastColumn) {
    throw new Error("Invalid columnList: does not contain children.");
  }

  const firstColumnEmpty = isEmptyColumn(firstColumn);
  const lastColumnEmpty = isEmptyColumn(lastColumn);

  if (firstColumnEmpty && lastColumnEmpty) {
    // Removes `columnList`
    tr.delete(columnListPos, columnListPos + columnList.nodeSize);

    return;
  }

  if (firstColumnEmpty) {
    tr.step(
      new ReplaceAroundStep(
        // Replaces `columnList`.
        columnListPos,
        columnListPos + columnList.nodeSize,
        // Replaces with content of last `column`.
        lastColumnAfterPos - lastColumn.nodeSize + 1,
        lastColumnAfterPos - 1,
        // Doesn't append anything.
        Slice.empty,
        0,
        false,
      ),
    );

    return;
  }

  if (lastColumnEmpty) {
    tr.step(
      new ReplaceAroundStep(
        // Replaces `columnList`.
        columnListPos,
        columnListPos + columnList.nodeSize,
        // Replaces with content of first `column`.
        firstColumnBeforePos + 1,
        firstColumnBeforePos + firstColumn.nodeSize - 1,
        // Doesn't append anything.
        Slice.empty,
        0,
        false,
      ),
    );

    return;
  }
}
