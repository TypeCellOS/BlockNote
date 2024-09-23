import { afterEach, beforeEach, describe, it } from "vitest";

import { BlockNoteEditor } from "@blocknote/core";

import { defaultSchemaTestCases } from "../testUtil/cases/defaultSchema";
import { streamDocumentOperations } from "./api";

const testCases = [defaultSchemaTestCases];

describe("Test BlockNote-Prosemirror conversion", () => {
  for (const testCase of testCases) {
    describe(
      "Case: " + testCase.name,
      () => {
        let editor: BlockNoteEditor<any, any, any>;
        const div = document.createElement("div");

        beforeEach(() => {
          editor = testCase.createEditor();
          editor.mount(div);
        });

        afterEach(() => {
          editor.mount(undefined);
          editor._tiptapEditor.destroy();
          editor = undefined as any;

          delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
        });

        it("translates simple paragraphs", async () => {
          const document = testCase.documents[1];
          editor.replaceBlocks(editor.document, document.blocks);

          await streamDocumentOperations(editor, "translate to german");

          // Add assertions here to check if the document was correctly translated
          // For example:
          // expect(editor.document).toMatchSnapshot();
        });
      },
      30000
    );
  }
});
