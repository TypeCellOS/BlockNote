// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensTableCell, LensTableContent } from "../model.js";
import { fitTable } from "./fitTable.js";

function cell(text: string, colspan = 1, rowspan = 1): LensTableCell {
  return {
    type: "tableCell",
    props: { colspan, rowspan },
    content: text === "" ? [] : [{ type: "text", text, styles: {} }],
  };
}

function table(...rows: LensTableCell[][]): LensTableContent {
  return {
    type: "tableContent",
    columnWidths: [undefined, undefined],
    rows: rows.map((cells) => ({ cells })),
  };
}

/** The text and the spans of each cell, row by row. */
function shape(content: LensTableContent): string[][] {
  return content.rows.map((row) =>
    (row.cells as LensTableCell[]).map((c) => {
      const text = c.content
        .map((item) => ("text" in item ? item.text : ""))
        .join("");
      return `${text}:${String(c.props.colspan)}x${String(c.props.rowspan)}`;
    }),
  );
}

describe("fitTable", () => {
  it("does not change a table that fits", () => {
    const content = table([cell("a", 1, 2), cell("b")], [cell("c")]);
    expect(fitTable(content)).toBe(content);
  });

  it("gives a short row empty cells at its end", () => {
    expect(shape(fitTable(table([cell("a"), cell("b")], [cell("c")])))).toEqual(
      [
        ["a:1x1", "b:1x1"],
        ["c:1x1", ":1x1"],
      ],
    );
  });

  it("fills the short row next to a cell that spans two rows", () => {
    // "a" covers two rows, thus the second row is three columns wide.
    expect(
      shape(
        fitTable(table([cell("a", 1, 2), cell("b")], [cell("c"), cell("d")])),
      ),
    ).toEqual([
      ["a:1x2", "b:1x1", ":1x1"],
      ["c:1x1", "d:1x1"],
    ]);
  });

  it("removes a span that goes below the last row", () => {
    // Without the span, "a" covers one position, and the empty cell under it
    // fills the second row.
    expect(
      shape(fitTable(table([cell("a", 1, 3), cell("b")], [cell("c")]))),
    ).toEqual([
      ["a:1x1", "b:1x1"],
      ["c:1x1", ":1x1"],
    ]);
  });
});
