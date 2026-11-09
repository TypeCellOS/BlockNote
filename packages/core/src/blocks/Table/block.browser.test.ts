import type { PartialBlock } from "@blocknote/core";
import { test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { checkAriaSnapshot, openEditor } from "@root/tests/a11y/helpers.js";

const mergedTableDocument: PartialBlock[] = [
  {
    id: "merged-table",
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      headerCols: 1,
      rows: [
        { cells: ["Region", "Apples", "Pears"] },
        {
          cells: [
            { type: "tableCell", content: ["North"] },
            {
              type: "tableCell",
              props: { colspan: 2, rowspan: 2 },
              content: ["Combined total"],
            },
          ],
        },
        // The merged data cell covers this row's remaining columns, leaving
        // South as its only DOM cell. It must still be a row header.
        { cells: ["South"] },
      ],
    },
  },
];

test.describe("ARIA", () => {
  test("merged table cells preserve row and column header roles", async () => {
    await openEditor(mergedTableDocument);
    await checkAriaSnapshot(page.getByRole("textbox"), "merged table");
  });
});
