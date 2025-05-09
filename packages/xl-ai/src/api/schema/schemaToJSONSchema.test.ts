import { afterEach, beforeEach, describe, it } from "vitest";

import { BlockNoteEditor } from "@blocknote/core";

import { defaultSchemaTestCases } from "../../testUtil/cases/defaultSchema.js";
import { blockNoteSchemaToJSONSchema } from "./schemaToJSONSchema.js";

const testCases = [defaultSchemaTestCases];

describe("Test BlockNote-Prosemirror conversion", () => {
  for (const testCase of testCases) {
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

      it.only("creates json schema", async () => {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(blockNoteSchemaToJSONSchema(editor.schema)));
        // }
      });
    });
  }
});
