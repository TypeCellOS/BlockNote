import {
  BlockNoteEditor,
  BlockNoteSchema,
  createBlockSpec,
} from "@blocknote/core";
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
  { type: "shelf", propSchema: {}, content: "none", layoutOnly: true },
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

// Layout blocks whose own export doesn't place their children.
const createPlainShelf = createReactBlockSpec(
  { type: "plainShelf", propSchema: {}, content: "none", layoutOnly: true },
  {
    renderFrame: (props) => <div ref={props.slotRef} />,
    toExternalHTML: () => <section className="plain-shelf" />,
  },
);

const VanillaShelf = createBlockSpec(
  { type: "vanillaShelf", propSchema: {}, content: "none", layoutOnly: true },
  {
    renderFrame: () => {
      const dom = document.createElement("div");
      return { dom, slot: dom };
    },
    toExternalHTML: () => {
      const dom = document.createElement("section");
      dom.className = "vanilla-shelf";
      return { dom };
    },
  },
);

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    disclosure: createDisclosure(),
    shelf: createShelf(),
    plainShelf: createPlainShelf(),
    vanillaShelf: VanillaShelf(),
  },
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

  it("places a layout block's children where its export puts them", () => {
    const dom = exportHTML([
      {
        type: "shelf",
        children: [{ type: "paragraph", content: "Child" }],
      },
    ]);
    expect(dom.querySelector("section > h2")?.textContent).toBe("Shelf");
    expect(dom.querySelector(".shelf-children")?.textContent).toBe("Child");
  });

  it("keeps a layout block's children after it when its export places them nowhere", () => {
    for (const type of ["plainShelf", "vanillaShelf"]) {
      const dom = exportHTML([
        { type, children: [{ type: "paragraph", content: "Child" }] },
      ]);
      expect(dom.firstElementChild?.tagName).toBe("SECTION");
      expect(dom.firstElementChild?.nextElementSibling?.textContent).toBe(
        "Child",
      );
    }
  });
});
