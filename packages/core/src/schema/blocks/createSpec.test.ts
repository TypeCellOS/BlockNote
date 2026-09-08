import { Node as TiptapNode } from "@tiptap/core";
import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { YAttributionMarksExtension } from "../../y/extensions/YAttributionMarks.js";
import { createBlockConfig, createBlockSpec } from "../index.js";
import { containerRootDOM } from "./createSpec.js";
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
  it("rejects a hand-written node whose content contradicts its config", () => {
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
    ).toThrow(/declares `content: "none"`, but its node holds "paragraph\+"/);
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
              children: { allow: "blocks" },
            },
            {},
          ),
        },
      }),
    ).toThrow(/Node name does not match block type/);
  });
});

describe("containerRootDOM", () => {
  const element = () => document.createElement("div");

  it("returns the dom itself when it is an element", () => {
    const dom = element();
    expect(containerRootDOM({ dom })).toBe(dom);
  });

  it("unwraps a fragment wrapping exactly one element", () => {
    const root = element();
    const fragment = document.createDocumentFragment();
    fragment.append(root);
    expect(containerRootDOM({ dom: fragment })).toBe(root);
  });

  it("returns null for a fragment with no single element root", () => {
    const empty = document.createDocumentFragment();
    expect(containerRootDOM({ dom: empty })).toBeNull();

    const multi = document.createDocumentFragment();
    multi.append(element(), element());
    expect(containerRootDOM({ dom: multi })).toBeNull();

    const textOnly = document.createDocumentFragment();
    textOnly.append(document.createTextNode("text"));
    expect(containerRootDOM({ dom: textOnly })).toBeNull();
  });
});

describe("container children parsing", () => {
  const renderDiv = () => {
    const dom = document.createElement("div");
    return { dom, contentDOM: dom };
  };

  const MixedBox = createBlockSpec(
    {
      type: "mixedBox" as const,
      propSchema: {},
      content: "none",
      children: { allow: "blocks" },
    },
    { render: renderDiv },
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

describe("container render contract", () => {
  const renderDiv = () => {
    const dom = document.createElement("div");
    return { dom, contentDOM: dom };
  };

  const createEditorWith = (spec: any) =>
    BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: { ...defaultBlockSpecs, probed: spec },
      }),
    });

  it("rejects a container declaring neither render nor renderFrame", () => {
    expect(() =>
      createBlockSpec(
        {
          // @ts-expect-error render is required on every block.
          type: "probed" as const,
          propSchema: {},
          content: "none" as const,
          children: { allow: "blocks" },
        },
        {},
      )(),
    ).toThrow(/must declare `render`/);
  });

  it("rejects renderFrame alone on a block that is not a pure container", () => {
    // A regular block always renders through `render`.
    expect(() =>
      createBlockSpec(
        {
          // @ts-expect-error render is required on every block.
          type: "probed" as const,
          propSchema: {},
          content: "inline" as const,
        },
        {
          renderFrame: () => {
            const dom = document.createElement("div");
            return { dom, slot: dom };
          },
        },
      )(),
    ).toThrow(/must declare `render`/);

    // A titled block needs its title row: `renderFrame` alone is not enough.
    expect(() =>
      createBlockSpec(
        {
          // @ts-expect-error render is required on every block.
          type: "probed" as const,
          propSchema: {},
          content: "inline" as const,
          children: { allow: "blocks" },
        },
        {
          renderFrame: () => {
            const dom = document.createElement("div");
            return { dom, slot: dom };
          },
        },
      )(),
    ).toThrow(/must declare `render`/);
  });

  it("rejects framing a pure container, whose render already owns its box", () => {
    const framed = createBlockSpec(
      {
        type: "probed",
        propSchema: {},
        content: "none",
        children: { allow: "blocks" },
      },
      {
        render: renderDiv,
        renderFrame: () => {
          const dom = document.createElement("div");
          return { dom, slot: dom };
        },
      },
    )();
    expect(() => createEditorWith(framed)).toThrow(
      /requires a separate content node/,
    );
  });
});

it("scopes external container parsing to childrenDOM", () => {
  const box = createBlockSpec(
    {
      type: "box",
      propSchema: {},
      content: "none",
      children: { allow: "blocks" },
    },
    {
      render() {
        const dom = document.createElement("div");
        return { dom, contentDOM: dom };
      },
      toExternalHTML() {
        const dom = document.createElement("div");
        const label = document.createElement("button");
        label.textContent = "Control label";
        const childrenDOM = document.createElement("div");
        dom.append(label, childrenDOM);
        return { dom, childrenDOM };
      },
    },
  )();
  const editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, box },
    }),
    initialContent: [
      { type: "box", children: [{ type: "paragraph", content: "Body" }] },
    ],
  });
  try {
    const html = editor.blocksToHTMLLossy(editor.document);
    expect(html).toContain('data-children-of="box"');
    const parsed = editor.tryParseHTMLToBlocks(html);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("box");
    expect(parsed[0].children).toHaveLength(1);
    expect(parsed[0].children[0].content).toEqual([
      { type: "text", text: "Body", styles: {} },
    ]);
  } finally {
    editor._tiptapEditor.destroy();
  }
});
