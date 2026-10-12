import {
  BlockNoteEditor,
  BlockNoteSchema,
  createBlockSpec,
  getBlockElementForNode,
} from "@blocknote/core";
import { BlockNoteViewRaw, createReactBlockSpec } from "@blocknote/react";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vite-plus/test";

// `getBlockElementForNode` finds a block's own element (the element with
// `data-node-type` and `data-id`) for every kind of block: regular blocks with
// and without a frame, containers, vanilla and React. A frame's root is the
// block's element.

const VanillaFrame = createBlockSpec(
  { type: "vanillaFrame", propSchema: {}, content: "inline" },
  {
    render: () => {
      const dom = document.createElement("div");
      return { dom, contentDOM: dom };
    },
    renderFrame: () => {
      const dom = document.createElement("section");
      const slot = document.createElement("div");
      dom.append(slot);
      return { dom, slot };
    },
  },
);

const VanillaContainer = createBlockSpec(
  {
    type: "vanillaContainer",
    propSchema: {},
    content: "none",
    container: true,
  },
  {
    renderFrame: () => {
      const dom = document.createElement("section");
      const slot = document.createElement("div");
      dom.append(slot);
      return { dom, slot };
    },
  },
);

const createReactContent = createReactBlockSpec(
  { type: "reactContent", propSchema: {}, content: "inline" },
  { render: (props) => <div ref={props.contentRef} /> },
);

const createReactFrame = createReactBlockSpec(
  { type: "reactFrame", propSchema: {}, content: "inline" },
  {
    render: (props) => <div ref={props.contentRef} />,
    renderFrame: (props) => (
      <section>
        <div ref={props.slotRef} />
      </section>
    ),
  },
);

const createReactContainer = createReactBlockSpec(
  { type: "reactContainer", propSchema: {}, content: "none", container: true },
  {
    renderFrame: (props) => (
      <section>
        <button contentEditable={false}>Chrome</button>
        <div ref={props.slotRef} />
      </section>
    ),
  },
);

const schema = withMultiColumn(
  BlockNoteSchema.create().extend({
    blockSpecs: {
      vanillaFrame: VanillaFrame(),
      vanillaContainer: VanillaContainer(),
      reactContent: createReactContent(),
      reactFrame: createReactFrame(),
      reactContainer: createReactContainer(),
    },
  }),
);

const child = (id: string) => ({ id, type: "paragraph", content: id });

// The regular blocks below that draw a frame.
const framedBlocks = ["heading", "toggle", "vanillaFrame", "reactFrame"];

describe("getBlockElementForNode", () => {
  it("finds the block's own element for every kind of block", async () => {
    const editor = BlockNoteEditor.create({
      schema,
      trailingBlock: false,
      initialContent: [
        {
          id: "paragraph",
          type: "paragraph",
          content: "P",
          children: [child("nested")],
        },
        {
          id: "heading",
          type: "heading",
          props: { isToggleable: true },
          content: "H",
          children: [child("headingChild")],
        },
        {
          id: "toggle",
          type: "toggleListItem",
          content: "T",
          children: [child("toggleChild")],
        },
        {
          id: "table",
          type: "table",
          content: { type: "tableContent", rows: [{ cells: ["a"] }] },
        },
        {
          id: "vanillaFrame",
          type: "vanillaFrame",
          content: "V",
          children: [child("vanillaFrameChild")],
        },
        {
          id: "vanillaContainer",
          type: "vanillaContainer",
          children: [child("vanillaContainerChild")],
        },
        {
          id: "reactContent",
          type: "reactContent",
          content: "R",
          children: [child("reactContentChild")],
        },
        {
          id: "reactFrame",
          type: "reactFrame",
          content: "F",
          children: [child("reactFrameChild")],
        },
        {
          id: "reactContainer",
          type: "reactContainer",
          children: [child("reactContainerChild")],
        },
        {
          id: "columns",
          type: "columnList",
          children: [
            {
              id: "column1",
              type: "column",
              children: [child("columnChild1")],
            },
            {
              id: "column2",
              type: "column",
              children: [child("columnChild2")],
            },
          ],
        },
      ] as any,
    }) as BlockNoteEditor<any, any, any>;
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    try {
      flushSync(() => {
        root.render(<BlockNoteViewRaw editor={editor} />);
      });
      // React draws its node views after the editor's own render.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const view = editor.prosemirrorView;
      const found: string[] = [];
      view.state.doc.descendants((node, pos) => {
        if (!node.type.isInGroup("bnBlock")) {
          return true;
        }
        const id = node.attrs.id as string;
        const element = getBlockElementForNode(view, pos, id);
        expect(element, id).toBeDefined();
        expect(element!.getAttribute("data-id"), id).toBe(id);
        expect(element!.getAttribute("data-node-type"), id).toBe(
          node.type.name,
        );
        if (node.type.name === "blockContainer") {
          // A regular block's element is in its `.bn-block-outer` (React
          // adds `display: contents` wrappers between them): the root of its
          // frame, or else `.bn-block`.
          const framed = framedBlocks.includes(id);
          expect(
            element!
              .parentElement!.closest(".bn-block-outer")!
              .getAttribute("data-id"),
            id,
          ).toBe(id);
          expect(element!.matches(".bn-block"), id).toBe(!framed);
          expect(element!.matches("section, .bn-toggle-frame"), id).toBe(
            framed,
          );
        }
        // Another block's id finds nothing.
        expect(getBlockElementForNode(view, pos, "other"), id).toBeUndefined();
        found.push(id);
        return true;
      });
      expect(found).toHaveLength(22);
    } finally {
      root.unmount();
      document.body.removeChild(div);
      editor._tiptapEditor.destroy();
    }
  });
});
