import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "./createSpec.js";

// A callout: an ordinary block with rich text of its own (the title), whose
// nested children are its body. The frame puts both inside the author's box.
const Callout = createBlockSpec(
  {
    type: "callout" as const,
    propSchema: {
      flavor: { default: "info", values: ["info", "warning"] as const },
    },
    content: "inline" as const,
  },
  {
    render: () => {
      const dom = document.createElement("div");
      dom.className = "callout-title";
      return { dom, contentDOM: dom };
    },
    renderFrame: (block) => {
      const dom = document.createElement("aside");
      dom.className = "callout";
      const icon = document.createElement("span");
      icon.className = "callout-icon";
      const slot = document.createElement("div");
      slot.className = "callout-inner";
      dom.append(icon, slot);

      const paint = (flavor: string) => {
        dom.setAttribute("data-flavor", flavor);
        icon.textContent = flavor === "warning" ? "!" : "i";
      };
      paint(block.props.flavor);

      return { dom, slot, update: (b: any) => paint(b.props.flavor) };
    },
  },
)();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { ...defaultBlockSpecs, callout: Callout } as const,
});

function editorWith(initialContent: any[]) {
  const editor = BlockNoteEditor.create({ schema, initialContent } as any);
  const div = document.createElement("div");
  editor.mount(div);
  return { editor, div };
}

const calloutDoc = [
  {
    id: "c",
    type: "callout" as const,
    props: { flavor: "warning" as const },
    content: "Careful!",
    children: [
      { id: "b1", type: "paragraph" as const, content: "Body one" },
      { id: "b2", type: "paragraph" as const, content: "Body two" },
    ],
  },
  { id: "after", type: "paragraph" as const, content: "After" },
];

describe("renderFrame", () => {
  it("renders the block's content and children inside the frame's slot", () => {
    const { editor, div } = editorWith(calloutDoc);
    const block = div.querySelector('[data-id="c"]')!;

    expect(
      block.querySelector(".callout > .callout-inner > .bn-block-content"),
    ).not.toBeNull();
    expect(
      block.querySelector(".callout > .callout-inner > .bn-block-group"),
    ).not.toBeNull();
    // The block keeps the structure every other block has around the frame.
    expect(block.classList.contains("bn-block-outer")).toBe(true);
    expect(block.querySelector(".bn-block > .callout")).not.toBeNull();

    editor._tiptapEditor.destroy();
  });

  it("keeps the title editable and the children as real blocks", () => {
    const { editor } = editorWith(calloutDoc);

    expect(editor.getBlock("c")!.content).toEqual([
      { type: "text", text: "Careful!", styles: {} },
    ]);
    expect(editor.getBlock("c")!.children.map((c: any) => c.id)).toEqual([
      "b1",
      "b2",
    ]);

    editor._tiptapEditor.destroy();
  });

  it("updates the frame when the block's props change", () => {
    const { editor, div } = editorWith(calloutDoc);
    const icon = () => div.querySelector('[data-id="c"] .callout-icon')!;

    expect(icon().textContent).toBe("!");
    editor.updateBlock("c", { props: { flavor: "info" } } as any);
    expect(icon().textContent).toBe("i");

    editor._tiptapEditor.destroy();
  });

  it("leaves blocks without a frame exactly as they were", () => {
    const { editor, div } = editorWith(calloutDoc);
    const paragraph = div.querySelector('[data-id="after"]')!;

    expect(paragraph.outerHTML).toBe(
      '<div class="bn-block-outer" data-node-type="blockOuter" data-id="after">' +
        '<div class="bn-block" data-node-type="blockContainer" data-id="after">' +
        '<div class="bn-block-content" data-content-type="paragraph">' +
        '<p class="bn-inline-content">After</p>' +
        "</div></div></div>",
    );

    editor._tiptapEditor.destroy();
  });

  it("frames a block that becomes a callout in place", () => {
    const { editor, div } = editorWith(calloutDoc);

    editor.updateBlock("after", { type: "callout" } as any);

    // Whether a block is framed follows from its type, so converting one into
    // a callout has to start framing it.
    expect(div.querySelectorAll(".callout").length).toBe(2);
    editor._tiptapEditor.destroy();
  });

  it("frames the block again when the conversion is undone", () => {
    const { editor, div } = editorWith(calloutDoc);

    editor.updateBlock("c", { type: "paragraph" } as any);
    expect(div.querySelectorAll(".callout").length).toBe(0);

    editor.undo();
    expect(editor.getBlock("c")!.type).toBe("callout");
    expect(div.querySelectorAll(".callout").length).toBe(1);
    editor._tiptapEditor.destroy();
  });

  it("round-trips through HTML like any other block", () => {
    const { editor } = editorWith(calloutDoc);

    const html = editor.blocksToFullHTML(editor.document as any);
    const parsed = editor.tryParseHTMLToBlocks(html);

    expect(parsed[0].type).toBe("callout");
    expect((parsed[0] as any).props.flavor).toBe("warning");
    expect((parsed[0] as any).content[0].text).toBe("Careful!");
    expect(parsed[0].children.map((c: any) => c.type)).toEqual([
      "paragraph",
      "paragraph",
    ]);

    editor._tiptapEditor.destroy();
  });
});
