import { describe, expect } from "vite-plus/test";

// One editor for the read-only cases of this file.
const it = globalThis.it.extend(
  "editor",
  { scope: "file" },
  // eslint-disable-next-line no-empty-pattern -- Vitest requires destructured fixture dependencies.
  async ({}, { onCleanup }) => {
    const { createSetupEditor } =
      await import("../../../../../tests/src/commands/node/setupEditor.js");
    const { editor } = await createSetupEditor(onCleanup)();
    return editor;
  },
);

describe("table column widths in HTML", () => {
  it("does not write an empty colwidth for a cell that spans columns without widths", ({
    editor,
  }) => {
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

  it("parses an empty or invalid width as no width, not as NaN", ({
    editor,
  }) => {
    const [table] = editor.tryParseHTMLToBlocks(
      '<table><tr><td colspan="2" colwidth=","><p>x</p></td></tr>' +
        "<tr><td><p>a</p></td><td><p>b</p></td></tr></table>",
    );
    const content = table.content as { columnWidths: unknown[] };
    expect(content.columnWidths.some((width) => Number.isNaN(width))).toBe(
      false,
    );
  });

  it("keeps a valid width next to an invalid width", ({ editor }) => {
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
