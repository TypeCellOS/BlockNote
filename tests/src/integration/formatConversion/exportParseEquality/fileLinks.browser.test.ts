import { BlockNoteSchema } from "@blocknote/core";
import { ReactFileBlock } from "@blocknote/react";
import { describe, expect } from "vite-plus/test";

describe("Lossy HTML round-trip for file blocks", () => {
  it.for([
    { name: "Core", schema: BlockNoteSchema.create() },
    {
      name: "React",
      schema: BlockNoteSchema.create().extend({
        blockSpecs: { file: ReactFileBlock() },
      }),
    },
  ])(
    "$name: keeps adjacent captionless files in separate paragraphs",
    async ({ schema }, { setupEditor }) => {
      const { editor } = await setupEditor({ mountType: false, schema });

      const html = editor.blocksToHTMLLossy([
        {
          type: "file",
          props: { url: "https://example.com/a.pdf", name: "a" },
        },
        {
          type: "file",
          props: { url: "https://example.com/b.pdf", name: "b" },
        },
      ]);

      expect(editor.tryParseHTMLToBlocks(html)).toMatchObject([
        {
          type: "paragraph",
          content: [{ type: "link", href: "https://example.com/a.pdf" }],
        },
        {
          type: "paragraph",
          content: [{ type: "link", href: "https://example.com/b.pdf" }],
        },
      ]);
    },
  );
});
