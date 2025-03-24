import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { describe, expect, it } from "vitest";

import { getCurrentTest } from "@vitest/runner";
import path from "path";
import {
  getTestEditor,
  testUpdateOperations,
} from "../../../testUtil/updates/updateOperations.js";

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
    params: { prompt: string }
  ) => Promise<any>
) {
  describe("Update", () => {
    it("translates simple paragraphs", async () => {
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
        prompt: "translate existing document to german",
      });

      await result.apply();

      // Add assertions here to check if the document was correctly translated
      // For example:
      // pass test name

      matchFileSnapshot(editor.document);

      // expect(await response.object).toMatchSnapshot();
    });

    it("changes block type (paragraph -> heading)", async () => {
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
        prompt: "change first paragraph to a heading",
      });

      await result.apply();
      matchFileSnapshot(editor.document);
    });

    it("changes simple formatting (paragraph)", async () => {
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
        prompt: "change first paragraph to bold",
      });

      await result.apply();

      // Add assertions here to check if the document was correctly translated
      // For example:
      matchFileSnapshot(editor.document);

      // expect(await response.object).toMatchSnapshot();
    });

    it("changes simple formatting (word)", async () => {
      const editor = createEditor([
        {
          type: "paragraph",
          content: "Hello world",
        },
      ]);

      const result = await callLLM(editor, {
        prompt: "change first word to bold",
      });

      await result.apply();

      // Add assertions here to check if the document was correctly translated
      // For example:
      matchFileSnapshot(editor.document);

      // expect(await response.object).toMatchSnapshot();
    });
  });

  describe("Update (formatting)", () => {
    for (const test of testUpdateOperations) {
      it(test.prompt, async () => {
        const editor = getTestEditor();
        const result = await callLLM(editor, {
          prompt: test.prompt,
        });
        await result.apply();

        const editorCompare = getTestEditor();
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
        prompt: "delete the first sentence",
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
        prompt: "Add a sentence with `Test` before the first sentence",
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
        prompt: `Add a paragraph with text "Test" after the first paragraph`,
      });

      await result.apply();

      matchFileSnapshot(editor.document);

      // expect(await response.object).toMatchSnapshot();
    });
  });
}
