import {
  BlockNoteEditor,
  BlockNoteSchema,
  BlockSchema,
  initializeESMDependencies,
  InlineContentSchema,
  StyleSchema,
  uploadToTmpFilesDotOrg_DEV_ONLY,
} from "@blocknote/core";
import { afterAll, beforeAll } from "vitest";

export const createTestEditor = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema: BlockNoteSchema<B, I, S>,
): (() => BlockNoteEditor<B, I, S>) => {
  let editor: BlockNoteEditor<B, I, S>;
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
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      schema,
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
