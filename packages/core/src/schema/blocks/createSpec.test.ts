import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { YAttributionMarksExtension } from "../../y/extensions/YAttributionMarks.js";
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
    // Every non-formatting mark comes from an optional extension. The Yjs
    // attribution marks are the ones reachable from core, so they stand in for
    // the `"annotation"` group here; register them so the group is non-empty.
    const editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: { ...defaultBlockSpecs, customPlain },
      }),
      extensions: [YAttributionMarksExtension()],
    });

    const plainType = editor.pmSchema.nodes["customPlain"];
    const insertMark = editor.pmSchema.marks["y-attributed-insert"];
    const boldMark = editor.pmSchema.marks["bold"];

    // The plain block allows the non-formatting mark but not the formatting one.
    expect(plainType.allowsMarkType(insertMark)).toBe(true);
    expect(plainType.allowsMarkType(boldMark)).toBe(false);

    // ...and so `allowedMarks` keeps the former while dropping the latter.
    const markNames = new Set(
      plainType
        .allowedMarks([
          insertMark.create({ userIds: ["test-user"] }),
          boldMark.create(),
        ])
        .map((m) => m.type.name),
    );
    expect(markNames.has("y-attributed-insert")).toBe(true);
    expect(markNames.has("bold")).toBe(false);

    editor._tiptapEditor.destroy();
  });
});
