import { deepEqual } from "../blocks/json.js";
import {
  cellRows,
  hasMergedCells,
  withoutMergedCells,
} from "../blocks/tableGrid.js";
import { inlineContentToText } from "../blocks/text.js";
import type { LensTableCell, LensTableContent } from "../blocks/types.js";
import { gaps } from "../diff/gaps.js";
import { myersMatch } from "../diff/myers.js";
import type { MatchedPair } from "../diff/types.js";
import { diff3 } from "./diff3.js";
import { mergeInlineContent } from "./inline.js";
import { type MergeOptions, mergeRecords, mergeValue } from "./threeWay.js";

type Row = LensTableCell[];

/**
 * Three-way merge of table content, row by row (diff3, see `alignRows`) and
 * cell by cell.
 *
 * - If a row is in the three tables (with the same number of cells), the
 *   merge merges each cell: its content and its props (for example its
 *   background color). If not, the row of the side that changed it wins
 *   (for a conflict, see `MergeOptions`).
 * - The merge removes rows that only the round trip added. An example is the
 *   empty header row that markdown gives to a table without a header row.
 * - A table with merged cells in a format without merged cells loses its
 *   merged cells when the text changes it (see `withoutMergedCells`).
 */
export function mergeTableContent(
  base: LensTableContent,
  ours: LensTableContent,
  theirs: LensTableContent,
  options: MergeOptions = {},
): LensTableContent {
  if (!hasMergedCells(base) && hasMergedCells(theirs)) {
    // A format without merged cells (markdown, plain text) shows a merged
    // cell as the cell and empty cells at the positions that it covers. The
    // rows of the document then align with the rows of the text only without
    // the merged cells. If the text did not change the table, it keeps them.
    if (deepEqual(base, ours)) {
      return theirs;
    }
    theirs = withoutMergedCells(theirs);
  }
  // The fields of the table belong to its rows: if the rows of the two sides
  // conflict, the fields come from the side whose rows win (ours, and in the
  // rebase theirs, see `MergeOptions`).
  let rowConflict = false;
  const baseRows = cellRows(base);
  const ourRows = cellRows(ours);
  const theirRows = cellRows(theirs);

  const rows = diff3(
    baseRows,
    ourRows,
    theirRows,
    alignRows(baseRows, ourRows),
    alignRows(baseRows, theirRows),
    {
      // A stable row has the same number of cells on the three sides (see
      // `alignRows`).
      stable: ({ base: baseRow, ours: ourRow, theirs: theirRow }) =>
        ourRow.map((cell, c) =>
          mergeCell(baseRow[c], cell, theirRow[c], options),
        ),
      ours: (units) => units,
      // As for text (see `merge/inline.ts`): the rows that applied first stay first.
      keepBothInserts: options.concurrent ? "theirs-first" : undefined,
      conflict: () => {
        rowConflict = true;
        options.onConflict?.();
      },
      conflictWinner: options.concurrent ? "theirs" : "ours",
      // `alignRows` also pairs rows with changed text.
      same: (baseRow, otherRow) => deepEqual(baseRow, otherRow),
    },
  );

  const field = <T>(baseValue: T, ourValue: T, theirValue: T): T =>
    rowConflict
      ? options.concurrent
        ? theirValue
        : ourValue
      : mergeValue(baseValue, ourValue, theirValue, options);
  return {
    type: "tableContent",
    columnWidths: field(
      base.columnWidths,
      ours.columnWidths,
      theirs.columnWidths,
    ),
    headerRows: field(base.headerRows, ours.headerRows, theirs.headerRows),
    headerCols: field(base.headerCols, ours.headerCols, theirs.headerCols),
    rows: rows.map((cells) => ({ cells })),
  };
}

function rowKey(row: Row): string {
  return row.map((cell) => inlineContentToText(cell.content)).join("\u0000");
}

/** Returns true if two rows have the same number of cells, and at least half of the cells have equal text. */
function similarRows(a: Row, b: Row): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let equal = 0;
  a.forEach((cell, c) => {
    if (
      inlineContentToText(cell.content) === inlineContentToText(b[c].content)
    ) {
      equal++;
    }
  });
  return 2 * equal >= a.length;
}

/**
 * Matches the rows with equal text. Then, between two matches, makes pairs by
 * position, if the two sides have the same number of rows and cells. These are
 * rows with changed text. If the two sides have a different number of rows
 * there (for example a changed row and a new row), a row with the same number
 * of cells and at least half of its cells equal is the same row (as for
 * blocks, see `MIN_SHARE` in `alignment/alignBlocks.ts`).
 */
function alignRows(a: Row[], b: Row[]): MatchedPair[] {
  const exact = myersMatch(a, b, (x, y) => rowKey(x) === rowKey(y));
  const pairs: MatchedPair[] = [];
  for (const { aStart, aEnd, bStart, bEnd, anchor } of gaps(
    exact,
    a.length,
    b.length,
  )) {
    const size = aEnd - aStart;
    if (
      size === bEnd - bStart &&
      a
        .slice(aStart, aEnd)
        .every((row, k) => row.length === b[bStart + k].length)
    ) {
      for (let k = 0; k < size; k++) {
        pairs.push({ aIndex: aStart + k, bIndex: bStart + k });
      }
    } else {
      for (const pair of myersMatch(
        a.slice(aStart, aEnd),
        b.slice(bStart, bEnd),
        similarRows,
      )) {
        pairs.push({
          aIndex: aStart + pair.aIndex,
          bIndex: bStart + pair.bIndex,
        });
      }
    }
    if (anchor) {
      pairs.push(anchor);
    }
  }
  return pairs;
}

function mergeCell(
  base: LensTableCell,
  ours: LensTableCell,
  theirs: LensTableCell,
  options: MergeOptions,
): LensTableCell {
  return {
    type: "tableCell",
    props: mergeRecords(base.props, ours.props, theirs.props, options),
    content: mergeInlineContent(
      base.content,
      ours.content,
      theirs.content,
      options,
    ),
  };
}
