import { afterAll, beforeAll } from "vitest";

import { uploadToTmpFilesDotOrg_DEV_ONLY } from "../../blocks/FileBlockContent/uploadToTmpFilesDotOrg_DEV_ONLY.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { initializeESMDependencies } from "../../util/esmDependencies.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  testSchema,
  TestStyleSchema,
} from "./testSchema.js";

export const setupTestEditor = () => {
  let editor: BlockNoteEditor<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >;
  const div = document.createElement("div");

  beforeAll(async () => {
    (window as any).__TEST_OPTIONS = (window as any).__TEST_OPTIONS || {};

    editor = BlockNoteEditor.create({
      codeBlock: {
        supportedLanguages: {
          javascript: {
            name: "JavaScript",
            aliases: ["js"],
          },
          python: {
            name: "Python",
            aliases: ["py"],
          },
        },
      },
      schema: testSchema,
      trailingBlock: false,
      uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
    });
    editor.mount(div);

    await initializeESMDependencies();
  });

  afterAll(() => {
    editor.mount(undefined);
    editor._tiptapEditor.destroy();
    editor = undefined as any;

    delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
  });

  return () => editor;
};
