import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { describe, expect, it } from "vite-plus/test";

// A React callout: the title is a React component with rich text, the body is
// the block's nested children, and the frame is the box around both.
const Callout = createReactBlockSpec(
  {
    type: "callout" as const,
    propSchema: {
      flavor: { default: "info", values: ["info", "warning"] as const },
    },
    content: "inline" as const,
  },
  {
    render: (props) => <div className="callout-title" ref={props.contentRef} />,
    renderFrame: (block: any) => {
      const dom = document.createElement("aside");
      dom.className = "callout";
      dom.setAttribute("data-flavor", block.props.flavor);
      const slot = document.createElement("div");
      slot.className = "callout-inner";
      dom.append(slot);
      return {
        dom,
        slot,
        update: (b: any) => dom.setAttribute("data-flavor", b.props.flavor),
      };
    },
  },
);

const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, callout: Callout() },
});

describe("renderFrame with a React block spec", () => {
  it("frames the React title and the children together", () => {
    const editor = BlockNoteEditor.create({
      schema,
      initialContent: [
        {
          id: "c",
          type: "callout",
          props: { flavor: "warning" },
          content: "Careful!",
          children: [{ id: "b", type: "paragraph", content: "Body" }],
        },
      ],
    } as any);
    const div = document.createElement("div");
    editor.mount(div);

    const block = div.querySelector('[data-id="c"]')!;
    expect(
      block.querySelector('.callout[data-flavor="warning"]'),
    ).not.toBeNull();
    expect(
      block.querySelector(".callout > .callout-inner > .bn-block-content"),
    ).not.toBeNull();
    expect(
      block.querySelector(".callout > .callout-inner > .bn-block-group"),
    ).not.toBeNull();

    expect(editor.getBlock("c")!.children.map((c: any) => c.id)).toEqual(["b"]);

    editor._tiptapEditor.destroy();
  });
});
