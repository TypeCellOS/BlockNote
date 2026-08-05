import { afterEach, describe, expect, it } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { createParagraphBlockSpec } from "../../blocks/Paragraph/block.js";
import { createHeadingBlockSpec } from "../../blocks/Heading/block.js";

/**
 * @vitest-environment jsdom
 */

const editorsToCleanup: BlockNoteEditor<any, any, any>[] = [];

afterEach(() => {
  for (const editor of editorsToCleanup) {
    editor.unmount();
  }
  editorsToCleanup.length = 0;
});

function withMetadata<
  T extends { config: { propSchema: Record<string, unknown> } },
>(spec: T): T {
  return {
    ...spec,
    config: {
      ...spec.config,
      propSchema: {
        ...spec.config.propSchema,
        metadata: { default: "" },
      },
    },
  } as T;
}

function createExtendedSchema() {
  return BlockNoteSchema.create({
    blockSpecs: Object.fromEntries(
      Object.entries(defaultBlockSpecs).map(([key, spec]) => [
        key,
        withMetadata(spec),
      ]),
    ) as typeof defaultBlockSpecs,
  });
}

function createExtendedEditor() {
  const editor = BlockNoteEditor.create({ schema: createExtendedSchema() });
  editorsToCleanup.push(editor);
  return editor;
}

describe("extending default block specs with additional props", () => {
  it("creates an editor with an extended paragraph prop without crashing", () => {
    const paragraph = createParagraphBlockSpec();
    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        paragraph: {
          ...paragraph,
          config: {
            ...paragraph.config,
            propSchema: {
              ...paragraph.config.propSchema,
              metadata: { default: "" },
            },
          },
        },
      },
    });

    const editor = BlockNoteEditor.create({ schema });
    editorsToCleanup.push(editor);

    expect(editor.document[0].type).toBe("paragraph");
    expect((editor.document[0].props as any).metadata).toBe("");
  });

  it("creates an editor using a helper that extends all block specs", () => {
    const editor = createExtendedEditor();

    expect(editor.document[0].type).toBe("paragraph");
    expect((editor.document[0].props as any).metadata).toBe("");
  });

  it("can update the extended prop on a block", () => {
    const editor = createExtendedEditor();

    editor.updateBlock(editor.document[0], {
      props: { metadata: '{"source":"xwiki"}' } as any,
    });

    expect((editor.document[0].props as any).metadata).toBe(
      '{"source":"xwiki"}',
    );
  });

  it("renders the extended prop in full HTML export", () => {
    const editor = createExtendedEditor();

    editor.updateBlock(editor.document[0], {
      props: { metadata: "test-value" } as any,
      content: "Hello",
    });

    const html = editor.blocksToFullHTML(editor.document);
    expect(html).toContain('data-metadata="test-value"');
  });

  it("does not render the extended prop when it equals the default", () => {
    const editor = createExtendedEditor();

    editor.updateBlock(editor.document[0], {
      content: "Hello",
    });

    const html = editor.blocksToFullHTML(editor.document);
    expect(html).not.toContain("data-metadata");
  });

  it("works when extending only specific block types", () => {
    const paragraph = createParagraphBlockSpec();
    const heading = createHeadingBlockSpec();

    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        paragraph: withMetadata(paragraph),
        heading: withMetadata(heading),
      },
    });

    const editor = BlockNoteEditor.create({ schema });
    editorsToCleanup.push(editor);

    editor.replaceBlocks(editor.document, [
      {
        type: "paragraph",
        content: "Text",
        props: { metadata: "p-meta" } as any,
      },
      {
        type: "heading",
        content: "Title",
        props: { metadata: "h-meta", level: 1 } as any,
      },
      { type: "bulletListItem", content: "Item" },
    ]);

    expect((editor.document[0].props as any).metadata).toBe("p-meta");
    expect((editor.document[1].props as any).metadata).toBe("h-meta");
    expect(editor.document[2].props).not.toHaveProperty("metadata");

    const html = editor.blocksToFullHTML(editor.document);
    expect(html).toContain('data-metadata="p-meta"');
    expect(html).toContain('data-metadata="h-meta"');
  });

  it("round-trips extended props through full HTML export and parse", () => {
    const editor = createExtendedEditor();

    editor.updateBlock(editor.document[0], {
      props: { metadata: '{"key":"value"}' } as any,
      content: "Round trip test",
    });

    const html = editor.blocksToFullHTML(editor.document);
    const parsed = editor.tryParseHTMLToBlocks(html);

    expect((parsed[0].props as any).metadata).toBe('{"key":"value"}');
  });

  it("mounts the editor to a DOM element without crashing", () => {
    const editor = createExtendedEditor();

    const container = document.createElement("div");
    editor.mount(container);

    expect(container.innerHTML).toContain("bn-block-content");

    editor.updateBlock(editor.document[0], {
      props: { metadata: "mounted-test" } as any,
      content: "Mounted",
    });

    expect((editor.document[0].props as any).metadata).toBe("mounted-test");
  });
});
