import {
  BlockNoteEditor,
  BlockNoteSchema,
  BlockSchema,
  createCodeBlockSpec,
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
      schema: schema.extend({
        blockSpecs: {
          codeBlock: createCodeBlockSpec({
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
          }),
        },
      }),
      tables: {
        splitCells: true,
        cellBackgroundColor: true,
        cellTextColor: true,
        headers: true,
      },
      trailingBlock: false,
      uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
    }) as any;
    editor.mount(div);
  });

  afterAll(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;

    delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
  });

  return () => editor;
};
