import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vitest";
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

    const selection = test.getTestSelection?.(editor);
    const steps = updateToReplaceSteps(
      {
        id: blockId,
        block: update.block,
      },
      editor.prosemirrorState.doc,
      undefined,
      selection?.from,
      selection?.to,
    );

    const formatted = steps.map((step) => ({
      replaced: editor.prosemirrorState.doc.slice(step.from, step.to).toJSON(),
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
  it(`${test.description}`, async () => {
    const editor = test.editor();
    executeTestCase(editor, test);
    expect(editor.document).toEqual(getExpectedEditor(test).document);
  });
}

describe("dontReplaceContentAtEnd=true", () => {
  it("keeps content at end of block", async () => {
    const editor = getEditorWithFormattingAndMentions();
    const steps = updateToReplaceSteps(
      {
        id: "ref1",
        block: {
          content: [{ type: "text", text: "Hello" }],
        },
      },
      editor.prosemirrorState.doc,
      true,
    );

    expect(steps).toEqual([]);
  });

  it("keeps content at end of block (mark update)", async () => {
    const editor = getEditorWithFormattingAndMentions();
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
      editor.prosemirrorState.doc,
      true,
    );

    expect(steps).toEqual([]);
  });
});
