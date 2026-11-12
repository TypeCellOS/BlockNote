// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensTableCell, LensTableContent } from "../model.js";
import { mergeTableContent } from "./table.js";

function cell(
  text: string,
  props: Record<string, unknown> = {},
): LensTableCell {
  return {
    type: "tableCell",
    props: { backgroundColor: "default", ...props },
    content: text === "" ? [] : [{ type: "text", text, styles: {} }],
  };
}

function table(rows: LensTableCell[][], headerRows?: number): LensTableContent {
  return {
    type: "tableContent",
    columnWidths: rows[0].map(() => undefined),
    headerRows,
    rows: rows.map((cells) => ({ cells })),
  };
}

const yellow = { backgroundColor: "yellow" };

describe("mergeTableContent", () => {
  it("keeps the props of a cell when its text changes", () => {
    const merged = mergeTableContent(
      table([[cell("A"), cell("B")]]),
      table([[cell("A, edited"), cell("B")]]),
      table([[cell("A", yellow), cell("B")]]),
    );
    expect(merged.rows[0].cells[0]).toEqual(cell("A, edited", yellow));
  });

  it("keeps the props of the cells of a changed row, if the text also adds a row", () => {
    const merged = mergeTableContent(
      table([
        [cell("Head"), cell("Two")],
        [cell("Apple"), cell("Banana")],
      ]),
      table([
        [cell("Head"), cell("Two")],
        [cell("Apple"), cell("Cherry")],
        [cell("New"), cell("Row")],
      ]),
      table([
        [cell("Head"), cell("Two")],
        [cell("Apple", yellow), cell("Banana")],
      ]),
    );
    expect(merged.rows.map((row) => row.cells)).toEqual([
      [cell("Head"), cell("Two")],
      [cell("Apple", yellow), cell("Cherry")],
      [cell("New"), cell("Row")],
    ]);
  });

  it("removes a row that only the round trip added", () => {
    // Markdown gives an empty header row to a table without a header row.
    const merged = mergeTableContent(
      table(
        [
          [cell(""), cell("")],
          [cell("A"), cell("B")],
        ],
        1,
      ),
      table(
        [
          [cell(""), cell("")],
          [cell("A, edited"), cell("B")],
        ],
        1,
      ),
      table([[cell("A", yellow), cell("B")]]),
    );
    expect(merged.rows).toHaveLength(1);
    expect(merged.headerRows).toBeUndefined();
    expect(merged.rows[0].cells[0]).toEqual(cell("A, edited", yellow));
  });

  it("adds a row that ours added", () => {
    const merged = mergeTableContent(
      table([[cell("A")]]),
      table([[cell("A")], [cell("New")]]),
      table([[cell("A", yellow)]]),
    );
    expect(merged.rows.map((row) => row.cells)).toEqual([
      [cell("A", yellow)],
      [cell("New")],
    ]);
  });

  it("gives the row of ours if the number of cells changed", () => {
    const merged = mergeTableContent(
      table([[cell("A"), cell("B")]]),
      table([[cell("A"), cell("B"), cell("C")]]),
      table([[cell("A", yellow), cell("B")]]),
    );
    expect(merged.rows[0].cells).toEqual([cell("A"), cell("B"), cell("C")]);
  });

  it("takes the fields of the table from the side whose rows win a conflict", () => {
    // Theirs adds a column and a header row. Ours adds a row. The rows
    // conflict, and in the document merge the rows of theirs win: thus also the
    // header rows of theirs.
    let conflicts = 0;
    const merged = mergeTableContent(
      table([
        [cell("a"), cell("b")],
        [cell("c"), cell("d")],
      ]),
      table([
        [cell("a"), cell("b")],
        [cell("c"), cell("d")],
        [cell("e"), cell("f")],
      ]),
      table(
        [
          [cell("a"), cell("b"), cell("x")],
          [cell("c"), cell("d"), cell("y")],
        ],
        1,
      ),
      { kind: "document", onConflict: () => conflicts++ },
    );
    expect(merged.headerRows).toBe(1);
    expect(merged.rows.map((row) => row.cells.length)).toEqual([3, 3]);
    // One conflict: the change of theirs and the insert of ours touch.
    expect(conflicts).toBe(1);
  });
});
