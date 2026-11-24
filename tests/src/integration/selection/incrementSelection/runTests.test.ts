import { TextSelection } from "@tiptap/pm/state";
import { describe, expect } from "vite-plus/test";

import { getPosOfTextNode } from "../../support/testUtil.js";
import { testSchema } from "../../support/testSchema.js";
import { incrementSelectionTestInstancesStart } from "./incrementSelectionTestInstances.js";

// Tests for getting the BlockNote selection while incrementing the ProseMirror
// selection to cover a wide range of cases.
describe("Increment selection tests (start)", () => {
  for (const {
    testCase,
    executeTest,
  } of incrementSelectionTestInstancesStart) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor({
        schema: testSchema,
        trailingBlock: false,
      });
      await executeTest(editor, testCase);
    });
  }
});

describe("Cut-block selection ending at a table-cell start", () => {
  // Exercise the requested range without the mounted table plugin, which can
  // rewrite that range before BlockNote reads it (#3017).
  it.for([
    { cell: "First", blockIds: ["before"], cutAtEnd: undefined },
    { cell: "Second", blockIds: ["before", "table"], cutAtEnd: "table" },
  ])(
    "keeps only the content before the $cell cell",
    async ({ cell, blockIds, cutAtEnd }, { setupEditor }) => {
      const { editor } = await setupEditor({
        trailingBlock: false,
        initialContent: [
          { id: "before", type: "paragraph", content: "Before" },
          {
            id: "table",
            type: "table",
            content: {
              type: "tableContent",
              rows: [{ cells: ["First", "Second"] }],
            },
          },
        ],
      });
      const { from, to } = editor.transact((tr) => {
        const start = getPosOfTextNode(tr.doc, "Before");
        const end = getPosOfTextNode(tr.doc, cell);
        tr.setSelection(TextSelection.create(tr.doc, start, end));
        return { from: start, to: end };
      });

      expect(editor.transact(({ selection }) => selection.from)).toBe(from);
      expect(editor.transact(({ selection }) => selection.to)).toBe(to);
      const result = editor.getSelectionCutBlocks();
      expect(result.blocks.map(({ id }) => id)).toEqual(blockIds);
      expect(result.blockCutAtEnd).toBe(cutAtEnd);
      if (cutAtEnd) {
        expect(result.blocks.at(-1)).toMatchObject({
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: [{ content: [{ text: "First" }] }] }],
          },
        });
      }
    },
  );
});
