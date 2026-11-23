import { describe, expect } from "vite-plus/test";
import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { createParagraphBlockSpec } from "../../blocks/Paragraph/block.js";
import {
  createExtendedSchema,
  withMetadata,
} from "./extendBlockSpec.test.fixture.js";

describe("extending default block specs with additional props", () => {
  it("creates an editor with an extended paragraph prop", async ({
    setupEditor,
  }) => {
    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        paragraph: withMetadata(createParagraphBlockSpec()),
      },
    });
    const { editor } = await setupEditor({ schema });

    expect(editor.document[0].type).toBe("paragraph");
    expect(editor.document[0].props).toHaveProperty("metadata", "");
  });

  it("creates an editor with all block specs extended", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ schema: createExtendedSchema() });

    expect(editor.document[0].type).toBe("paragraph");
    expect(editor.document[0].props).toHaveProperty("metadata", "");
  });

  it("can update the extended prop on a block", async ({ setupEditor }) => {
    const { editor } = await setupEditor({ schema: createExtendedSchema() });

    editor.updateBlock(editor.document[0], {
      props: { metadata: '{"source":"xwiki"}' },
    });

    expect(editor.document[0].props).toHaveProperty(
      "metadata",
      '{"source":"xwiki"}',
    );
  });
});
