import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { describe, expect, it } from "vitest";

import { getCurrentTest } from "@vitest/runner";
import path from "path";
import { testUpdateOperations } from "../../../testUtil/updates/updateOperations.js";

const BASE_FILE_PATH = path.resolve(__dirname, "__snapshots__");

function createEditor(initialContent: PartialBlock[]) {
  return BlockNoteEditor.create({
    initialContent,
  });
}

function matchFileSnapshot(data: any, postFix = "") {
  const t = getCurrentTest()!;
  // this uses the same snapshot path, regardless of the model / streaming params
  expect(data).toMatchFileSnapshot(
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
  ) => Promise<any>,
  skipTestsRequiringCapabilities?: {
    mentions?: boolean;
    textAlignment?: boolean;
  }
) {
  describe("Update (formatting)", () => {
    for (const test of testUpdateOperations) {
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
        await result.apply();

        const editorCompare = test.editor();
        editorCompare.updateBlock(test.updateOp.id, test.updateOp.block);
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

      await result.apply();

      matchFileSnapshot(editor.document);

      // expect(await response.object).toMatchSnapshot();
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

      await result.apply();

      matchFileSnapshot(editor.document);

      // expect(await response.object).toMatchSnapshot();
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

      await result.apply();

      matchFileSnapshot(editor.document);

      // expect(await response.object).toMatchSnapshot();
    });
  });
}
