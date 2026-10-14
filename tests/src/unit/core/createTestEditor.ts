import {
  BlockNoteEditor,
  BlockNoteSchema,
  BlockSchema,
  createCodeBlockSpec,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { afterAll, beforeAll } from "vite-plus/test";

// "Uploads" a file by encoding it as a base64 data URL.
async function uploadFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

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
            defaultLanguage: "javascript",
            supportedLanguages: {
              javascript: {
                name: "JavaScript",
                aliases: ["js"],
              },
              typescript: {
                name: "TypeScript",
                aliases: ["ts"],
              },
              python: {
                name: "Python",
                aliases: ["py"],
              },
            },
          }),
        },
      }),
      links: {
        HTMLAttributes: {
          rel: "external",
          "data-custom-attribute": true,
        },
      },
      tables: {
        splitCells: true,
        cellBackgroundColor: true,
        cellTextColor: true,
        headers: true,
      },
      trailingBlock: false,
      uploadFile,
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
