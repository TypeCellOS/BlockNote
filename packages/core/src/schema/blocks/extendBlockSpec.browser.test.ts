import { describe, expect } from "vite-plus/test";
import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { createParagraphBlockSpec } from "../../blocks/Paragraph/block.js";
import { createHeadingBlockSpec } from "../../blocks/Heading/block.js";
import {
  createExtendedSchema,
  withMetadata,
} from "./extendBlockSpec.test.fixture.js";

describe("extending default block specs with additional props", () => {
  it("renders the extended prop in full HTML export", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      schema: createExtendedSchema(),
    });

    editor.updateBlock(editor.document[0], {
      props: { metadata: "test-value" },
      content: "Hello",
    });

    const html = editor.blocksToFullHTML(editor.document);
    expect(html).toContain('data-metadata="test-value"');
  });

  it("does not render the extended prop when it equals the default", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      schema: createExtendedSchema(),
    });

    editor.updateBlock(editor.document[0], {
      content: "Hello",
    });

    const html = editor.blocksToFullHTML(editor.document);
    expect(html).not.toContain("data-metadata");
  });

  it("works when extending only specific block types", async ({
    setupEditor,
  }) => {
    const paragraph = createParagraphBlockSpec();
    const heading = createHeadingBlockSpec();

    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        paragraph: withMetadata(paragraph),
        heading: withMetadata(heading),
      },
    });

    const { editor } = await setupEditor({ mountType: false, schema });

    editor.replaceBlocks(editor.document, [
      {
        type: "paragraph",
        content: "Text",
        props: { metadata: "p-meta" },
      },
      {
        type: "heading",
        content: "Title",
        props: { metadata: "h-meta", level: 1 },
      },
      { type: "bulletListItem", content: "Item" },
    ]);

    expect(editor.document[0].props).toHaveProperty("metadata", "p-meta");
    expect(editor.document[1].props).toHaveProperty("metadata", "h-meta");
    expect(editor.document[2].props).not.toHaveProperty("metadata");

    const html = editor.blocksToFullHTML(editor.document);
    expect(html).toContain('data-metadata="p-meta"');
    expect(html).toContain('data-metadata="h-meta"');
  });

  it("round-trips extended props through full HTML export and parse", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      schema: createExtendedSchema(),
    });

    editor.updateBlock(editor.document[0], {
      props: { metadata: '{"key":"value"}' },
      content: "Round trip test",
    });

    const html = editor.blocksToFullHTML(editor.document);
    const parsed = editor.tryParseHTMLToBlocks(html);

    expect(parsed[0].props).toHaveProperty("metadata", '{"key":"value"}');
  });

  it("mounts the editor to a DOM element without crashing", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      schema: createExtendedSchema(),
    });

    const container = document.createElement("div");
    editor.mount(container);

    expect(container.innerHTML).toContain("bn-block-content");

    editor.updateBlock(editor.document[0], {
      props: { metadata: "mounted-test" },
      content: "Mounted",
    });

    expect(editor.document[0].props).toHaveProperty("metadata", "mounted-test");
  });
});
