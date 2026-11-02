import { inlineContentToText, tableCellsContent } from "../blocks/text.js";
import type { LensTableCell, LensTableContent } from "../blocks/types.js";
import { myersMatch } from "../diff/myers.js";
import type { MatchedPair } from "../diff/types.js";
import { diff3 } from "./diff3.js";
import { mergeInlineContent } from "./inline.js";
import { mergeRecords, mergeValue } from "./threeWay.js";

type Row = LensTableCell[];

/**
 * Three-way merge of table content, row by row (diff3, see `alignRows`) and
 * cell by cell.
 *
 * - If a row is in the three tables with the same number of cells, the merge
 *   merges each cell: its content and its props (for example its background
 *   color). If not, the result is the row of ours.
 * - The merge removes rows that only the round trip added. An example is the
 *   empty header row that markdown gives to a table without a header row.
 */
export function mergeTableContent(
  base: LensTableContent,
  ours: LensTableContent,
  theirs: LensTableContent,
): LensTableContent {
  const baseRows = rowsOf(base);
  const ourRows = rowsOf(ours);
  const theirRows = rowsOf(theirs);

  const rows = diff3(
    baseRows,
    ourRows,
    theirRows,
    alignRows(baseRows, ourRows),
    alignRows(baseRows, theirRows),
    {
      stable: ({ base: baseRow, ours: ourRow, theirs: theirRow }) =>
        baseRow.length === ourRow.length && baseRow.length === theirRow.length
          ? ourRow.map((cell, c) => mergeCell(baseRow[c], cell, theirRow[c]))
          : ourRow,
      ours: (units) => units,
    },
  );

  return {
    type: "tableContent",
    columnWidths: mergeValue(
      base.columnWidths,
      ours.columnWidths,
      theirs.columnWidths,
    ),
    headerRows: mergeValue(base.headerRows, ours.headerRows, theirs.headerRows),
    headerCols: mergeValue(base.headerCols, ours.headerCols, theirs.headerCols),
    rows: rows.map((cells) => ({ cells })),
  };
}

/** Returns the rows of the table, with all cells in tableCell form. A cell can also be only inline content. */
function rowsOf(table: LensTableContent): Row[] {
  return table.rows.map((row) => {
    const contents = tableCellsContent(row);
    return row.cells.map((cell, c) =>
      Array.isArray(cell)
        ? {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
            },
            content: contents[c],
          }
        : cell,
    );
  });
}

function rowKey(row: Row): string {
  return row.map((cell) => inlineContentToText(cell.content)).join("\u0000");
}

/**
 * Matches the rows with equal text. Then, between two matches, makes pairs by
 * position, if the two sides have the same number of rows and cells. These are
 * rows with changed text.
 */
function alignRows(a: Row[], b: Row[]): MatchedPair[] {
  const exact = myersMatch(a, b, (x, y) => rowKey(x) === rowKey(y));
  const pairs: MatchedPair[] = [];
  let aStart = 0;
  let bStart = 0;
  for (const next of [...exact, { aIndex: a.length, bIndex: b.length }]) {
    const gap = next.aIndex - aStart;
    if (
      gap > 0 &&
      gap === next.bIndex - bStart &&
      a
        .slice(aStart, next.aIndex)
        .every((row, k) => row.length === b[bStart + k].length)
    ) {
      for (let k = 0; k < gap; k++) {
        pairs.push({ aIndex: aStart + k, bIndex: bStart + k });
      }
    }
    if (next.aIndex < a.length) {
      pairs.push(next);
    }
    aStart = next.aIndex + 1;
    bStart = next.bIndex + 1;
  }
  return pairs;
}

function mergeCell(
  base: LensTableCell,
  ours: LensTableCell,
  theirs: LensTableCell,
): LensTableCell {
  return {
    type: "tableCell",
    props: mergeRecords(base.props, ours.props, theirs.props),
    content: mergeInlineContent(base.content, ours.content, theirs.content),
  };
}
