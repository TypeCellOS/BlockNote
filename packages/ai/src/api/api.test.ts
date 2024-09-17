import { afterEach, beforeEach, describe, it } from "vitest";

import { BlockNoteEditor } from "@blocknote/core";

import { createOpenAI } from "@ai-sdk/openai";
import { jsonSchema, streamObject } from "ai";
import { defaultSchemaTestCases } from "../testUtil/cases/defaultSchema";
import { AI_OPERATION_UPDATE, createOperationsArraySchema } from "./api";

const model = createOpenAI({
  // additional settings
  apiKey: "",
})("gpt-4o-2024-08-06", {
  // structuredOutputs: true,
});

const testCases = [defaultSchemaTestCases];

describe.skip("Test BlockNote-Prosemirror conversion", () => {
  for (const testCase of testCases) {
    describe(
      "Case: " + testCase.name,
      () => {
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

        it("translates simple paragraphs", async () => {
          const document = testCase.documents[1];
          editor.replaceBlocks(editor.document, document.blocks);
          console.log(editor.document);
          const ret = await streamObject({
            model,
            mode: "tool",
            // schemaName: "operations",
            // schemaDescription: "Apply operations to document.",
            schema: jsonSchema(
              createOperationsArraySchema([AI_OPERATION_UPDATE] as any)
            ),
            messages: [
              {
                role: "system",
                content:
                  "You're manipulating a text document. This is the document:",
              },
              {
                role: "system",
                content: JSON.stringify(editor.document),
              },
              {
                role: "user",
                content: "translate to german",
              },
            ],

            // prompt: "translate to dutch",
          });

          for await (const partialObject of ret.partialObjectStream) {
            console.log(JSON.stringify(partialObject));
          }
        });
        // for (const document of testCase.documents) {
        //   // eslint-disable-next-line no-loop-func
        //   it("Convert " + document.name + " to/from prosemirror", () => {
        //     // NOTE: only converts first block
        //     validateConversion(document.blocks[0], editor);
        //   });
        // }
      },
      30000
    );
  }
});
