import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { describe, expect, it } from "vitest";

import { getCurrentTest } from "@vitest/runner";
import path from "path";
import { createAIExtension, getAIExtension } from "../../../AIExtension.js";
import { updateOperationTestCases } from "../../../testUtil/cases/updateOperationTestCases.js";
import { CallLLMResult } from "../CallLLMResult.js";

const BASE_FILE_PATH = path.resolve(__dirname, "__snapshots__");

function createEditor(initialContent: PartialBlock[]) {
  return BlockNoteEditor.create({
    initialContent,
    _extensions: {
      ai: createAIExtension({
        model: undefined as any,
      }),
    },
  });
}

async function matchFileSnapshot(data: any, postFix = "") {
  const t = getCurrentTest()!;
  // this uses the same snapshot path, regardless of the model / streaming params
  await expect(data).toMatchFileSnapshot(
    path.resolve(
      BASE_FILE_PATH,
      t.suite!.name,
      t.name + (postFix ? `_${postFix}` : "") + ".json"
    )
  );
}

export function generateSharedTestCases(
  callLLM: (
    editor: BlockNoteEditor<any, any, any>,
    params: { userPrompt: string }
  ) => Promise<CallLLMResult>,
  skipTestsRequiringCapabilities?: {
    mentions?: boolean;
    textAlignment?: boolean;
  }
) {
  describe("Update (formatting)", () => {
    for (const test of updateOperationTestCases) {
      it(test.description, async (c) => {
        if (
          skipTestsRequiringCapabilities &&
          Object.keys(test.requiredCapabilities || {}).some(
            (c) =>
              skipTestsRequiringCapabilities[
                c as keyof typeof skipTestsRequiringCapabilities
              ] === true
          )
        ) {
          c.skip();
        }

        const editor = test.editor();
        const result = await callLLM(editor, {
          userPrompt: test.userPrompt,
        });
        await result.execute();

        // the prosemirrorState has all details with suggested changes, so we use this for the snapshot
        await matchFileSnapshot(editor.prosemirrorState.doc.toJSON());
        // console.log(
        //   JSON.stringify(editor.prosemirrorState.doc.toJSON(), null, 2)
        // );

        // apply the update defined in the test to a new editor,
        // and compare the result
        const editorCompare = test.editor();
        editorCompare.updateBlock(test.updateOp.id, test.updateOp.block);

        // we first need to accept changes to get the correct result
        getAIExtension(editor).acceptChanges();

        expect(editor.document).toEqual(editorCompare.document);
      });
    }
  });

  describe("Delete", () => {
    it("deletes a paragraph", async () => {
      const editor = createEditor([
        {
          type: "paragraph",
          content: "Hello",
        },
        {
          type: "paragraph",
          content: "World",
        },
      ]);
      const result = await callLLM(editor, {
        userPrompt: "delete the first sentence",
      });

      await result.execute();

      // we first need to accept changes to get the correct result
      getAIExtension(editor).acceptChanges();

      await matchFileSnapshot(editor.document);
    });
  });

  describe("Insert", () => {
    it("inserts a paragraph at start", async () => {
      const editor = createEditor([
        {
          type: "paragraph",
          content: "Hello",
        },
      ]);
      const result = await callLLM(editor, {
        userPrompt: "Add a sentence with `Test` before the first sentence",
      });

      await result.execute();

      // console.log(
      //   JSON.stringify(editor.prosemirrorState.doc.toJSON(), null, 2)
      // );

      // we first need to accept changes to get the correct result
      getAIExtension(editor).acceptChanges();

      await matchFileSnapshot(editor.document);
    });

    it("inserts a paragraph at end", async () => {
      const editor = createEditor([
        {
          type: "paragraph",
          content: "Hello",
        },
      ]);
      const result = await callLLM(editor, {
        userPrompt: `Add a paragraph with text "Test" after the first paragraph`,
      });

      await result.execute();

      // we first need to accept changes to get the correct result
      getAIExtension(editor).acceptChanges();

      await matchFileSnapshot(editor.document);
    });
  });
}
