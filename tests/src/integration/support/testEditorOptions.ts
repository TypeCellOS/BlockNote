import { createCodeBlockSpec } from "@blocknote/core";

import { testSchema } from "./testSchema.js";

// "Uploads" a file by encoding it as a base64 data URL.
function uploadFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const testEditorOptions = {
  schema: testSchema.extend({
    blockSpecs: {
      codeBlock: createCodeBlockSpec({
        defaultLanguage: "javascript",
        supportedLanguages: {
          javascript: { name: "JavaScript", aliases: ["js"] },
          typescript: { name: "TypeScript", aliases: ["ts"] },
          python: { name: "Python", aliases: ["py"] },
        },
      }),
    },
  }),
  links: {
    HTMLAttributes: { rel: "external", "data-custom-attribute": true },
  },
  tables: {
    splitCells: true,
    cellBackgroundColor: true,
    cellTextColor: true,
    headers: true,
  },
  trailingBlock: false,
  uploadFile,
};

/** Register a lazy editor for a file of read-only cases. */
export function useFileTestEditor() {
  return globalThis.it.extend(
    "editor",
    { scope: "file" },
    // eslint-disable-next-line no-empty-pattern -- Vitest requires destructured fixture dependencies.
    async ({}, { onCleanup }) => {
      const { createSetupEditor } =
        await import("../../commands/node/setupEditor.js");
      const { editor } = await createSetupEditor(onCleanup)(testEditorOptions);
      return editor;
    },
  );
}
