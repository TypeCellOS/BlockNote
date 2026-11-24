import { TextSelection } from "@tiptap/pm/state";
import { describe, expect } from "vite-plus/test";

import { getPosOfTextNode } from "../../../shared/testUtil.js";
import { testSchema } from "../../testSchema.js";
import { incrementSelectionTestInstancesEnd } from "./incrementSelectionTestInstances.js";

// These snapshots characterize the mounted selection. At a cell start the
// table-editing plugin can rewrite a cross-block range (BlockNote #3017);
// the headless suite separately asserts how BlockNote cuts the requested range.
describe("Increment selection tests (end)", () => {
  for (const { testCase, executeTest } of incrementSelectionTestInstancesEnd) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        schema: testSchema,
        trailingBlock: false,
      });
      await executeTest(editor, testCase);
    });
  }
});

// https://github.com/TypeCellOS/BlockNote/issues/3017
it("currently snaps a paragraph-to-cell-start selection back to the paragraph", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({
    mountType: "dom",
    trailingBlock: false,
    initialContent: [
      { id: "before", type: "paragraph", content: "Before table" },
      {
        id: "table",
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["First cell", "Second cell"] }],
        },
      },
    ],
  });

  const { from, to, paragraphEnd } = editor.transact((tr) => {
    const from = getPosOfTextNode(tr.doc, "Before table") + 1;
    const to = getPosOfTextNode(tr.doc, "Second cell");
    const paragraphEnd = getPosOfTextNode(tr.doc, "Before table", true);
    tr.setSelection(TextSelection.create(tr.doc, from, to));
    return { from, to, paragraphEnd };
  });

  // The requested range is meaningful: it begins inside the paragraph and
  // would include the first cell. Table editing instead selects the paragraph.
  expect(to).toBeGreaterThan(paragraphEnd);
  expect(
    editor.transact(({ selection }) => [selection.from, selection.to]),
  ).toEqual([from - 1, paragraphEnd]);
  const result = editor.getSelectionCutBlocks();
  expect(result.blocks.map(({ id }) => id)).toEqual(["before"]);
  expect(result.blockCutAtEnd).toBeUndefined();
});
