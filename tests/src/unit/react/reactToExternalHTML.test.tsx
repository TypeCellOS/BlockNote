import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { describe, expect, it } from "vite-plus/test";

// A React `toExternalHTML` places the block's children with `childrenRef`,
// like core's `toExternalHTML` does with `childrenDOM`.

const createDisclosure = createReactBlockSpec(
  { type: "disclosure", propSchema: {}, content: "inline" },
  {
    render: (props) => <div ref={props.contentRef} />,
    toExternalHTML: (props) => (
      <details>
        <summary ref={props.contentRef} />
        <div className="disclosure-children" ref={props.childrenRef} />
      </details>
    ),
  },
);

const createShelf = createReactBlockSpec(
  { type: "shelf", propSchema: {}, content: "none", container: true },
  {
    renderFrame: (props) => <div ref={props.slotRef} />,
    toExternalHTML: (props) => (
      <section>
        <h2 contentEditable={false}>Shelf</h2>
        <div className="shelf-children" ref={props.childrenRef} />
      </section>
    ),
  },
);

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { disclosure: createDisclosure(), shelf: createShelf() },
});

function exportHTML(blocks: any[]) {
  const editor = BlockNoteEditor.create({ schema });
  try {
    const dom = document.createElement("div");
    dom.innerHTML = editor.blocksToHTMLLossy(blocks);
    return dom;
  } finally {
    editor._tiptapEditor.destroy();
  }
}

describe("React toExternalHTML childrenRef", () => {
  it("places a block's children where its export puts them", () => {
    const dom = exportHTML([
      {
        type: "disclosure",
        content: "Title",
        children: [{ type: "paragraph", content: "Child" }],
      },
    ]);
    expect(dom.querySelector("summary")?.textContent).toBe("Title");
    expect(dom.querySelector(".disclosure-children")?.textContent).toBe(
      "Child",
    );
  });

  it("places a container's children where its export puts them", () => {
    const dom = exportHTML([
      {
        type: "shelf",
        children: [{ type: "paragraph", content: "Child" }],
      },
    ]);
    expect(dom.querySelector("section > h2")?.textContent).toBe("Shelf");
    expect(dom.querySelector(".shelf-children")?.textContent).toBe("Child");
  });
});
