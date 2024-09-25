import { afterEach, beforeEach, describe, it } from "vitest";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor";

import { defaultSchemaTestCases } from "../testUtil/cases/defaultSchema";
import { sliceToBlockNote } from "./nodeConversions";

describe("Test selection conversion", () => {
  const testCase = defaultSchemaTestCases;
  describe("Case: " + testCase.name, () => {
    let editor: BlockNoteEditor<any, any, any>;
    const div = document.createElement("div");

    beforeEach(() => {
      editor = testCase.createEditor();
      // Note that we don't necessarily need to mount a root
      // Currently, we do mount to a root so that it reflects the "production" use-case more closely.

      // However, it would be nice to increased converage and share the same set of tests for these cases:
      // - does render to a root
      // - does not render to a root
      // - runs in server (jsdom) environment using server-util
      editor.mount(div);
    });

    afterEach(() => {
      editor.mount(undefined);
      editor._tiptapEditor.destroy();
      editor = undefined as any;

      delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
    });

    // eslint-disable-next-line no-loop-func
    it("selection test within block and nested block", () => {
      const document = testCase.documents.find(
        (doc) => doc.name === "complex/misc"
      )!;

      editor.replaceBlocks(editor.document, document.blocks);

      const start = editor._tiptapEditor.$node("heading")!.pos + 3;
      const end = editor._tiptapEditor.$node("paragraph")!.after!.pos - 10;
      const slice = editor._tiptapEditor.state.doc.slice(start, end, true);

      console.log(JSON.stringify(slice.toJSON()));
      console.log(
        JSON.stringify(
          sliceToBlockNote(
            slice,
            editor.schema.blockSchema,
            editor.schema.inlineContentSchema,
            editor.schema.styleSchema
          ),
          undefined,
          2
        )
      );
    });

    it("selection test across list blocks", () => {
      const document = testCase.documents.find(
        (doc) => doc.name === "lists/basic"
      )!;

      editor.replaceBlocks(editor.document, document.blocks);

      const start = editor._tiptapEditor.$node("bulletListItem")!.pos + 3;
      const end =
        editor._tiptapEditor.$node("numberedListItem")!.after!.pos - 10;
      const slice = editor._tiptapEditor.state.doc.slice(start, end, true);
      // console.log(JSON.stringify(slice.toJSON()));

      console.log(
        JSON.stringify(
          sliceToBlockNote(
            slice,
            editor.schema.blockSchema,
            editor.schema.inlineContentSchema,
            editor.schema.styleSchema
          ),
          undefined,
          2
        )
      );
    });
  });
});
