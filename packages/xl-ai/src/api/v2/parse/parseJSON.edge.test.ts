import { describe, expect, it } from "vite-plus/test";

import { computeOperations } from "../index.js";
import { createEditor } from "../testUtil/fixtures.js";
import { parseJSON } from "./parseJSON.js";

/**
 * A table of two rows: the first cell has the props, and the other cells
 * fit a first cell with a row span of 2.
 */
function table(props: Record<string, unknown>) {
  return {
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        {
          cells: [
            { type: "tableCell", props, content: "a" },
            { type: "tableCell", content: "b" },
          ],
        },
        { cells: [{ type: "tableCell", content: "c" }] },
      ],
    },
  } as never;
}

describe("parseJSON: the spans of table cells", () => {
  const editor = createEditor([{ id: "p", type: "paragraph" }]);

  it("accepts the largest spans of the HTML table model", () => {
    expect(parseJSON(editor, [table({ colspan: 1000 })]).error).toBeUndefined();
    expect(parseJSON(editor, [table({ rowspan: 2 })]).error).toBeUndefined();
  });

  it("gives an error for a column span above 1,000", () => {
    expect(parseJSON(editor, [table({ colspan: 1001 })])).toEqual({
      error: "invalid-document",
    });
  });

  it("gives an error for a row span above 65,534", () => {
    expect(parseJSON(editor, [table({ rowspan: 65535 })])).toEqual({
      error: "invalid-document",
    });
  });

  it("gives an error for a table with a large span in a child block", () => {
    expect(
      parseJSON(editor, [
        {
          type: "paragraph",
          content: "parent",
          children: [table({ colspan: 1_000_000 })],
        },
      ]),
    ).toEqual({ error: "invalid-document" });
  });

  it("gives an error value, not an exception, for a JSON write with a column span of 1,000,000", () => {
    // Before the check, the conversion of core overflowed the stack.
    expect(
      computeOperations(editor, {
        document: [table({ colspan: 1_000_000 })],
        base: "current",
      }),
    ).toEqual({ error: "invalid-document" });
  });
});
