import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

describe("table column widths in HTML", () => {
  const editor = BlockNoteEditor.create();

  it("does not write an empty colwidth for a cell that spans columns without widths", () => {
    const html = editor.blocksToHTMLLossy([
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                { type: "tableCell", content: "Merged", props: { colspan: 2 } },
              ],
            },
            { cells: ["a", "b"] },
          ],
        },
      },
    ]);
    expect(html).not.toContain('colwidth=","');
  });

  it("parses an empty or invalid width as no width, not as NaN", () => {
    const [table] = editor.tryParseHTMLToBlocks(
      '<table><tr><td colspan="2" colwidth=","><p>x</p></td></tr>' +
        "<tr><td><p>a</p></td><td><p>b</p></td></tr></table>",
    );
    const content = table.content as { columnWidths: unknown[] };
    expect(content.columnWidths.some((width) => Number.isNaN(width))).toBe(
      false,
    );
  });

  it("keeps a valid width next to an invalid width", () => {
    const [table] = editor.tryParseHTMLToBlocks(
      '<table><tr><td colspan="2" colwidth="200,"><p>x</p></td></tr>' +
        "<tr><td><p>a</p></td><td><p>b</p></td></tr></table>",
    );
    const content = table.content as { columnWidths: unknown[] };
    expect(content.columnWidths[0]).toBe(200);
    expect(content.columnWidths.some((width) => Number.isNaN(width))).toBe(
      false,
    );
  });
});
