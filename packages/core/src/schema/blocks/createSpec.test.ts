import { Node as TiptapNode } from "@tiptap/core";
import { DOMParser } from "@tiptap/pm/model";
import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { YAttributionMarksExtension } from "../../y/extensions/YAttributionMarks.js";
import { createBlockConfig, createBlockSpec } from "../index.js";
import { createBlockSpecFromTiptapNode } from "./internal.js";

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

describe("block spec and node agreement", () => {
  it("leaves a hand-written node's content expression authoritative", () => {
    expect(() =>
      BlockNoteSchema.create().extend({
        blockSpecs: {
          holder: createBlockSpecFromTiptapNode(
            {
              node: TiptapNode.create({
                name: "holder",
                group: "blockContent",
                content: "paragraph+",
              }),
              type: "holder",
              content: "none",
            },
            {},
          ),
        },
      }),
    ).not.toThrow();
  });

  it("rejects a hand-written node whose name contradicts its config", () => {
    expect(() =>
      BlockNoteSchema.create().extend({
        blockSpecs: {
          holder: createBlockSpecFromTiptapNode(
            {
              node: TiptapNode.create({
                name: "notHolder",
                group: "block",
                content: "block+",
              }),
              type: "holder",
              content: "none",
            },
            {},
          ),
        },
      }),
    ).toThrow(/Node name does not match block type/);
  });
});

describe("layout block children parsing", () => {
  const frameDiv = () => {
    const dom = document.createElement("div");
    return { dom, slot: dom };
  };

  const MixedBox = createBlockSpec(
    {
      type: "mixedBox" as const,
      propSchema: {},
      content: "none",
      layoutOnly: true,
    },
    { renderFrame: frameDiv },
  )();

  const createEditor = () =>
    BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          mixedBox: MixedBox,
        },
      }),
    });

  it("wraps loose text around blocks into child blocks without parseContent", () => {
    const editor = createEditor();

    const blocks = editor.tryParseHTMLToBlocks(
      `<div data-node-type="mixedBox"><p>First</p>Loose text</div>`,
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("mixedBox");
    expect(blocks[0].children.map((child: any) => child.type)).toEqual([
      "paragraph",
      "paragraph",
    ]);
    expect(
      blocks[0].children.map((child: any) => child.content?.[0]?.text),
    ).toEqual(["First", "Loose text"]);

    editor._tiptapEditor.destroy();
  });
});

describe("render hooks contract", () => {
  const renderDiv = () => {
    const dom = document.createElement("div");
    return { dom, contentDOM: dom };
  };
  const frameDiv = () => {
    const dom = document.createElement("div");
    return { dom, slot: dom };
  };

  it("rejects a block declaring neither render nor renderFrame", () => {
    expect(() =>
      createBlockSpec(
        {
          type: "probed" as const,
          propSchema: {},
          content: "none" as const,
          layoutOnly: true,
        },
        {},
      )(),
    ).toThrow(/must declare `renderFrame`/);
  });

  it("rejects renderFrame alone on a block that is not a layout block", () => {
    // A block with content draws it in `render`.
    expect(() =>
      createBlockSpec(
        {
          type: "probed" as const,
          propSchema: {},
          content: "inline" as const,
        },
        { renderFrame: frameDiv },
      )(),
    ).toThrow(/must declare `render`/);
  });

  it("rejects render on a layout block, which has no content to draw", () => {
    expect(() =>
      createBlockSpec(
        {
          type: "probed",
          propSchema: {},
          content: "none",
          layoutOnly: true,
        },
        { render: renderDiv, renderFrame: frameDiv },
      )(),
    ).toThrow(/has no content for `render` to draw/);
  });

  it("rejects a layout block frame that declines", () => {
    const declining = createBlockSpec(
      {
        type: "probed",
        propSchema: {},
        content: "none",
        layoutOnly: true,
      },
      { renderFrame: () => undefined },
    )();
    const editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: { ...defaultBlockSpecs, probed: declining },
      }),
    });
    expect(() => editor.blocksToHTMLLossy([{ type: "probed" } as any])).toThrow(
      /must draw its frame/,
    );
    editor._tiptapEditor.destroy();
  });
});

it("exports a layout block like a regular block, parsing back through its own parse", () => {
  const box = createBlockSpec(
    {
      type: "box",
      propSchema: { tone: { default: "plain" } },
      content: "none",
      layoutOnly: true,
    },
    {
      renderFrame() {
        const dom = document.createElement("div");
        return { dom, slot: dom };
      },
      toExternalHTML() {
        const dom = document.createElement("div");
        dom.className = "box";
        const label = document.createElement("button");
        label.textContent = "Control label";
        const childrenDOM = document.createElement("div");
        childrenDOM.className = "box-children";
        dom.append(label, childrenDOM);
        return { dom, childrenDOM };
      },
      // External HTML has no BlockNote markers, so the block recognizes its
      // own export, and reads its children from where it placed them.
      parse: (el) => (el.classList.contains("box") ? {} : undefined),
      parseContent: ({ el, schema }) =>
        DOMParser.fromSchema(schema).parse(el.querySelector(".box-children")!, {
          topNode: schema.nodes["blockGroup"].create(),
        }).content,
    },
  )();
  const editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, box },
    }),
    initialContent: [
      {
        type: "box",
        props: { tone: "loud" },
        children: [{ type: "paragraph", content: "Body" }],
      },
    ],
  });
  try {
    const html = editor.blocksToHTMLLossy(editor.document);
    expect(html).not.toContain("data-node-type");
    expect(html).not.toContain("data-frame-slot");
    expect(html).not.toContain("data-id");
    expect(html).toContain('data-tone="loud"');
    const parsed = editor.tryParseHTMLToBlocks(html);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("box");
    expect(parsed[0].props).toEqual({ tone: "loud" });
    expect(parsed[0].children).toHaveLength(1);
    expect(parsed[0].children[0].content).toEqual([
      { type: "text", text: "Body", styles: {} },
    ]);
  } finally {
    editor._tiptapEditor.destroy();
  }
});
