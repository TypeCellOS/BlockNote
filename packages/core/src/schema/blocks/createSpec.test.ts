import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createBlockConfig, createBlockSpec } from "../index.js";

// A minimal "plain" content block WITHOUT a custom `parseContent`, so parsing
// its HTML exercises the generic plain branch in `getParseRules`' `getContent`.
const customPlain = createBlockSpec(
  createBlockConfig(() => ({
    type: "customPlain" as const,
    propSchema: {},
    content: "plain" as const,
  })),
  {
    parse: (el) => (el.classList?.contains("custom-plain") ? {} : undefined),
    render: () => {
      const dom = document.createElement("div");
      return { dom, contentDOM: dom };
    },
  },
)();

const createEditor = () =>
  BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, customPlain },
    }),
  });

describe("plain content parsing", () => {
  it("keeps text and drops formatting marks", () => {
    const editor = createEditor();

    const blocks = editor.tryParseHTMLToBlocks(
      `<div class="custom-plain">hello <b>world</b></div>`,
    );

    expect(blocks[0].type).toBe("customPlain");
    expect(blocks[0].content).toEqual([
      {
        styles: {},
        text: "hello world",
        type: "text",
      },
    ]);
    editor._tiptapEditor.destroy();
  });

  it("merges multiple paragraphs with newlines", () => {
    const editor = createEditor();

    const blocks = editor.tryParseHTMLToBlocks(
      `<div class="custom-plain"><p>first</p><p>second</p></div>`,
    );

    expect(blocks[0].type).toBe("customPlain");
    expect(blocks[0].content).toEqual([
      {
        styles: {},
        text: "first\nsecond",
        type: "text",
      },
    ]);

    editor._tiptapEditor.destroy();
  });

  it("converts line breaks to newline characters", () => {
    const editor = createEditor();

    const blocks = editor.tryParseHTMLToBlocks(
      `<div class="custom-plain">first<br>second</div>`,
    );

    expect(blocks[0].type).toBe("customPlain");
    expect(blocks[0].content).toEqual([
      {
        styles: {},
        text: "first\nsecond",
        type: "text",
      },
    ]);

    editor._tiptapEditor.destroy();
  });

  it("keeps allowed (non-formatting) marks while dropping formatting", () => {
    const editor = createEditor();

    // Checked at the ProseMirror level (parsing into a `blockGroup` top node,
    // like `HTMLToBlocks` does) because the block model intentionally
    // represents plain content as a bare string, without marks.
    const container = document.createElement("div");
    container.innerHTML = `<div class="custom-plain">hello <b>bold</b> <ins data-id="1">inserted</ins></div>`;
    const parsed = PMDOMParser.fromSchema(editor.pmSchema).parse(container, {
      topNode: editor.pmSchema.nodes["blockGroup"].create(),
    });

    // blockGroup > blockContainer > customPlain
    const blockContent = parsed.child(0).child(0);
    expect(blockContent.type.name).toBe("customPlain");
    expect(blockContent.textContent).toBe("hello bold inserted");

    const markNames = new Set<string>();
    blockContent.forEach((child) => {
      child.marks.forEach((mark) => markNames.add(mark.type.name));
    });
    // The suggestion mark is allowed on plain blocks and survives parsing;
    // the formatting mark is dropped by the schema.
    expect(markNames.has("insertion")).toBe(true);
    expect(markNames.has("bold")).toBe(false);

    editor._tiptapEditor.destroy();
  });
});
