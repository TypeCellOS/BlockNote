import { BlockNoteEditor, expandPMRangeToWords } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";
import { getEditorWithFormattingAndMentions } from "../testUtil/cases/editors/formattingAndMentions.js";
import {
  DocumentOperationTestCase,
  getExpectedEditor,
} from "../testUtil/cases/index.js";
import { updateOperationTestCases } from "../testUtil/cases/updateOperationTestCases.js";
import { updateToReplaceSteps } from "./changeset.js";

function executeTestCase(
  editor: BlockNoteEditor<any, any, any>,
  test: DocumentOperationTestCase,
) {
  for (const update of test.baseToolCalls) {
    if (update.type !== "update") {
      throw new Error("Only update operations are supported");
    }
    const blockId = update.id;
    const doc = editor.transact(({ doc }) => doc);

    let selection = test.getTestSelection?.(editor);
    if (selection) {
      selection = expandPMRangeToWords(doc, {
        $from: doc.resolve(selection.from),
        $to: doc.resolve(selection.to),
      });
    }
    const steps = updateToReplaceSteps(
      {
        id: blockId,
        block: update.block,
      },
      doc,
      undefined,
      selection?.from,
      selection?.to,
    );

    const formatted = steps.map((step) => ({
      replaced: doc.slice(step.from, step.to).toJSON(),
      step: step,
    }));

    expect(formatted).toMatchSnapshot();

    editor.transact((tr) => {
      for (const step of steps) {
        const mapped = step.map(tr.mapping);
        if (!mapped) {
          throw new Error("Failed to map step");
        }
        tr.step(mapped);
      }
    });
  }
}

for (const test of updateOperationTestCases) {
  it(`${test.description}`, async ({ setupEditor }) => {
    const editor = await test.editor(setupEditor);
    executeTestCase(editor, test);
    expect(editor.document).toEqual(
      (await getExpectedEditor(setupEditor, test)).document,
    );
  });
}

describe("dontReplaceContentAtEnd=true", () => {
  it("keeps content at end of block", async ({ setupEditor }) => {
    const editor = await getEditorWithFormattingAndMentions(setupEditor);
    const steps = updateToReplaceSteps(
      {
        id: "ref1",
        block: {
          content: [{ type: "text", text: "Hello" }],
        },
      },
      editor.transact(({ doc }) => doc),
      true,
    );

    expect(steps).toEqual([]);
  });

  it("keeps content at end of block (mark update)", async ({ setupEditor }) => {
    const editor = await getEditorWithFormattingAndMentions(setupEditor);
    const steps = updateToReplaceSteps(
      {
        id: "ref1",
        block: {
          content: [
            { type: "text", text: "Hello, " },
            { type: "text", text: "wo", styles: { bold: true } },
          ],
        },
      },
      editor.transact(({ doc }) => doc),
      true,
    );

    expect(steps).toEqual([]);
  });
});
