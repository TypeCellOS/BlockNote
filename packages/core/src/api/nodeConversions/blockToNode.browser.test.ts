import { describe, expect } from "vite-plus/test";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";

describe("blockToNode: plain-block backwards compatibility (write path)", () => {
  it("mounts an editor with legacy initialContent without throwing", async ({
    setupEditor,
  }) => {
    // @ts-expect-error Legacy JSON still carries styles on a plain block.
    const block: PartialBlock = {
      type: "codeBlock",
      props: { language: "javascript" },
      content: [{ type: "text", text: "const x = 1;", styles: { bold: true } }],
    };
    const { editor } = await setupEditor({
      mountType: "dom",
      initialContent: [block],
    });
    expect(editor.document.map((b) => b.type)).toEqual(["codeBlock"]);
    expect(editor.document[0].content).toEqual([
      { styles: {}, text: "const x = 1;", type: "text" },
    ]);
  });
});

describe("blockToNode: tables", () => {
  // The widths of a merged cell must not have an empty entry for a column
  // without a width. The HTML export writes such an entry as `colwidth=","`
  // or `colwidth="200,"`, and the HTML parser reads that as `NaN`.
  describe.each([
    // No column in the span has a width: no widths, as a cell without a span.
    { columnWidths: undefined, parsed: [undefined, undefined] },
    // One column has a width: `0` for the other, as prosemirror-tables has it.
    { columnWidths: [200, undefined], parsed: [200, 0] },
  ])(
    "a merged cell with the column widths $columnWidths",
    ({ columnWidths, parsed }) => {
      const table = {
        type: "table",
        content: {
          type: "tableContent",
          columnWidths,
          rows: [
            {
              cells: [
                { type: "tableCell", props: { colspan: 2 }, content: "Merged" },
              ],
            },
            { cells: ["a", "b"] },
          ],
        },
      } as any;

      it("has no NaN column widths after an HTML round trip", async ({
        setupEditor,
      }) => {
        const { editor } = await setupEditor({ mountType: false });

        const html = editor.blocksToFullHTML([table]);
        const block = editor
          .tryParseHTMLToBlocks(html)
          .find((block) => block.type === "table")!;

        expect(block.content.columnWidths).toEqual(parsed);
      });
    },
  );

  // A merged cell without widths must have one `<col>` for each column in its
  // span. With only one `<col>`, the width of the third column goes to the
  // second column.
  it("exports a <col> for each column of a merged cell without widths", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: false });

    const html = editor.blocksToFullHTML([
      {
        type: "table",
        content: {
          type: "tableContent",
          columnWidths: [undefined, undefined, 200],
          rows: [
            {
              cells: [
                { type: "tableCell", props: { colspan: 2 }, content: "Merged" },
                "c",
              ],
            },
            { cells: ["a", "b", "c"] },
          ],
        },
      } as any,
    ]);

    const cols = new DOMParser()
      .parseFromString(html, "text/html")
      .querySelectorAll("col");
    expect(Array.from(cols, (col) => col.style.width)).toEqual([
      "",
      "",
      "200px",
    ]);
  });
});
