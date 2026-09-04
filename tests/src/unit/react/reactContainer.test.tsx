import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";
import { BlockNoteViewRaw, createReactBlockSpec } from "@blocknote/react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

/**
 * A container block written in React: no content of its own, children only.
 * The same thing `xl-multi-column` does in plain ProseMirror, but declared
 * with `createReactBlockSpec`.
 */
const Box = createReactBlockSpec(
  {
    type: "box" as const,
    propSchema: { tone: { default: "plain" } },
    content: "none" as const,
    children: { allow: "any" as const },
  },
  {
    render: (props) => (
      <div className="rbox" data-tone={props.block.props.tone}>
        <div className="rbox-body" ref={props.contentRef} />
      </div>
    ),
  },
);

const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, box: Box() },
});

const initialContent = [
  {
    id: "b",
    type: "box" as const,
    props: { tone: "loud" as const },
    children: [
      { id: "c1", type: "paragraph" as const, content: "One" },
      { id: "c2", type: "paragraph" as const, content: "Two" },
    ],
  },
];

describe("a container block written in React", () => {
  let editor: BlockNoteEditor<typeof schema.blockSchema>;
  let root: Root;
  let div: HTMLDivElement;

  beforeEach(() => {
    div = document.createElement("div");
    document.body.append(div);
    editor = BlockNoteEditor.create({
      schema,
      initialContent,
      trailingBlock: false,
    });
    root = createRoot(div);
    flushSync(() => {
      root.render(<BlockNoteViewRaw editor={editor} />);
    });
  });

  afterEach(() => {
    root.unmount();
    editor._tiptapEditor.destroy();
    div.remove();
  });

  it("holds its children in the document", () => {
    const box = editor.document[0];
    expect(box.type).toBe("box");
    expect(box.props).toMatchObject({ tone: "loud" });
    expect(box.children.map((c) => c.type)).toEqual(["paragraph", "paragraph"]);
  });

  it("renders the author's markup, with the children inside its slot", () => {
    const rendered = div.querySelector(".rbox");
    expect(rendered).not.toBeNull();
    expect(rendered!.getAttribute("data-tone")).toBe("loud");
    // `@tiptap/react` puts its own element between the slot and the content,
    // so the children are inside the author's slot rather than under it.
    expect(
      div.querySelectorAll(".rbox .rbox-body .bn-block-outer").length,
    ).toBe(2);
  });

  it("carries the attributes its parse rules read, on one element", () => {
    const nodes = div.querySelectorAll('[data-node-type="box"]');
    expect(nodes.length).toBe(1);
    expect(nodes[0].getAttribute("data-tone")).toBe("loud");
    // What the side menu and drag handles resolve a block by.
    expect(nodes[0].getAttribute("data-id")).toBe("b");
  });

  it("round-trips through HTML", () => {
    const html = editor.blocksToFullHTML(editor.document);
    const parsed = editor.tryParseHTMLToBlocks(html);
    expect(parsed.map((b: any) => b.type)).toEqual(["box"]);
    expect((parsed[0] as any).props.tone).toBe("loud");
    expect((parsed[0] as any).children.map((c: any) => c.type)).toEqual([
      "paragraph",
      "paragraph",
    ]);
  });
});
