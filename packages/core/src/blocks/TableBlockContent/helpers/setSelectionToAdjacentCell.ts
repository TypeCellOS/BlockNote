import { Editor } from "@tiptap/core";
import { Node, ResolvedPos } from "prosemirror-model";
import { CellSelection } from "prosemirror-tables";
import { NodeSelection, Selection, TextSelection } from "prosemirror-state";

import { getBlockInfoFromSelection } from "../../../api/getBlockInfoFromPos.js";

function getNextCellBeforePos($cellBeforePos: ResolvedPos): number | undefined {
  const cellColIndex = $cellBeforePos.index();
  const cellRowIndex = $cellBeforePos.index(-1);

  const rowCellCount = $cellBeforePos.node().childCount;
  const nextCellInRowExists = cellColIndex < rowCellCount - 1;
  const rowCount = $cellBeforePos.node(-1).childCount;
  const nextRowExists = cellRowIndex < rowCount - 1;

  if (nextCellInRowExists) {
    return $cellBeforePos.posAtIndex(cellColIndex + 1);
  }

  if (nextRowExists) {
    return $cellBeforePos.after() + 1;
  }

  return undefined;
}

function getCellSelectionForNextCell(
  selection: CellSelection,
  doc: Node
): CellSelection | undefined {
  const $anchorCell = selection.$anchorCell;
  const anchorCellRowIndex = $anchorCell.index(-1);
  const anchorCellColIndex = $anchorCell.index();

  const $headCell = selection.$headCell;
  const headCellRowIndex = $headCell.index(-1);
  const headCellColIndex = $headCell.index();

  const anchorIsBeforeHead =
    anchorCellRowIndex === headCellRowIndex
      ? // Selection is within a single row.
        anchorCellColIndex < headCellColIndex
      : // Selection spans multiple rows.
        anchorCellRowIndex < headCellRowIndex;
  const $cellBeforePos = anchorIsBeforeHead ? $headCell : $anchorCell;
  const nextCellBeforePos = getNextCellBeforePos($cellBeforePos);

  if (nextCellBeforePos) {
    return CellSelection.create(doc, nextCellBeforePos);
  }

  return undefined;
}

function getNodeSelectionForNextCell(
  selection: NodeSelection,
  doc: Node
): NodeSelection | undefined {
  const $anchor = selection.$anchor;

  const $cellBeforePos = doc.resolve($anchor.before());
  const nextCellBeforePos = getNextCellBeforePos($cellBeforePos);

  if (nextCellBeforePos) {
    const paragraphBeforePos = $anchor.pos;
    const paragraphBeforeOffset = paragraphBeforePos - $cellBeforePos.pos;

    return NodeSelection.create(doc, nextCellBeforePos + paragraphBeforeOffset);
  }

  return undefined;
}

function getTextSelectionForNextCell(
  selection: TextSelection,
  doc: Node
): TextSelection | undefined {
  const $anchor = selection.$anchor;

  const $cellBeforePos = doc.resolve($anchor.before(-1));
  const nextCellBeforePos = getNextCellBeforePos($cellBeforePos);

  const paragraphStartPos = $anchor.start();
  const paragraphStartOffset = paragraphStartPos - $cellBeforePos.pos;

  if (nextCellBeforePos) {
    return TextSelection.create(
      doc,
      doc.resolve(nextCellBeforePos + paragraphStartOffset).end()
    );
  }

  return undefined;
}

function getSelectionForNextCell(
  selection: Selection,
  doc: Node
): Selection | undefined {
  if (selection instanceof CellSelection) {
    return getCellSelectionForNextCell(selection, doc);
  }

  if (selection instanceof NodeSelection) {
    return getNodeSelectionForNextCell(selection, doc);
  }

  if (selection instanceof TextSelection) {
    return getTextSelectionForNextCell(selection, doc);
  }

  return undefined;
}

function getPrevCellBeforePos($cellBeforePos: ResolvedPos): number | undefined {
  const cellColIndex = $cellBeforePos.index();
  const cellRowIndex = $cellBeforePos.index(-1);

  const prevCellInRowExists = cellColIndex > 0;
  const prevRowExists = cellRowIndex > 0;

  if (prevCellInRowExists) {
    return $cellBeforePos.posAtIndex(cellColIndex - 1);
  }

  if (prevRowExists) {
    const $prevRowEndPos = $cellBeforePos.doc.resolve(
      $cellBeforePos.before() - 1
    );
    const prevRowChildCount = $prevRowEndPos.node().childCount;

    return $prevRowEndPos.posAtIndex(prevRowChildCount - 1);
  }

  return undefined;
}

function getCellSelectionForPrevCell(
  selection: CellSelection,
  doc: Node
): CellSelection | undefined {
  const $anchorCell = selection.$anchorCell;
  const anchorCellRowIndex = $anchorCell.index(-1);
  const anchorCellColIndex = $anchorCell.index();

  const $headCell = selection.$headCell;
  const headCellRowIndex = $headCell.index(-1);
  const headCellColIndex = $headCell.index();

  const anchorIsBeforeHead =
    anchorCellRowIndex === headCellRowIndex
      ? // Selection is within a single row.
        anchorCellColIndex < headCellColIndex
      : // Selection spans multiple rows.
        anchorCellRowIndex < headCellRowIndex;
  const $cellBeforePos = anchorIsBeforeHead ? $anchorCell : $headCell;
  const prevCellBeforePos = getPrevCellBeforePos($cellBeforePos);

  if (prevCellBeforePos) {
    return CellSelection.create(doc, prevCellBeforePos);
  }

  return undefined;
}

function getNodeSelectionForPrevCell(
  selection: NodeSelection,
  doc: Node
): NodeSelection | undefined {
  const $anchor = selection.$anchor;

  const $cellBeforePos = doc.resolve($anchor.before());
  const prevCellBeforePos = getPrevCellBeforePos($cellBeforePos);

  if (prevCellBeforePos) {
    const paragraphBeforePos = $anchor.pos;
    const paragraphBeforeOffset = paragraphBeforePos - $cellBeforePos.pos;

    return NodeSelection.create(doc, prevCellBeforePos + paragraphBeforeOffset);
  }

  return undefined;
}

function getTextSelectionForPrevCell(
  selection: TextSelection,
  doc: Node
): TextSelection | undefined {
  const $anchor = selection.$anchor;

  const $cellBeforePos = doc.resolve($anchor.before(-1));
  const prevCellBeforePos = getPrevCellBeforePos($cellBeforePos);

  const paragraphStartPos = $anchor.start();
  const paragraphStartOffset = paragraphStartPos - $cellBeforePos.pos;

  if (prevCellBeforePos) {
    return TextSelection.create(
      doc,
      doc.resolve(prevCellBeforePos + paragraphStartOffset).end()
    );
  }

  return undefined;
}

function getSelectionForPrevCell(
  selection: Selection,
  doc: Node
): Selection | undefined {
  if (selection instanceof CellSelection) {
    return getCellSelectionForPrevCell(selection, doc);
  }

  if (selection instanceof NodeSelection) {
    return getNodeSelectionForPrevCell(selection, doc);
  }

  if (selection instanceof TextSelection) {
    return getTextSelectionForPrevCell(selection, doc);
  }

  return undefined;
}

export function setSelectionToAdjacentCell(
  editor: Editor,
  direction: "next" | "prev"
): boolean {
  return editor.commands.command(({ dispatch, state, tr }) => {
    const { blockNoteType } = getBlockInfoFromSelection(state);
    if (blockNoteType !== "table") {
      return false;
    }

    const newSelection =
      direction === "next"
        ? getSelectionForNextCell(tr.selection, tr.doc)
        : getSelectionForPrevCell(tr.selection, tr.doc);

    if (dispatch && newSelection) {
      dispatch(tr.setSelection(newSelection));
    }

    return true;
  });
}
