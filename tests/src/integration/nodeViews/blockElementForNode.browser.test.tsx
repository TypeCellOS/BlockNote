import {
  BlockNoteSchema,
  createBlockSpec,
  getBlockElementForNode,
} from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import { describe, expect } from "vite-plus/test";

// `getBlockElementForNode` finds a block's own element (the element with
// `data-node-type` and `data-id`) for every kind of block: regular blocks with
// and without a frame, layout blocks, vanilla and React.

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

const VanillaLayout = createBlockSpec(
  {
    type: "vanillaLayout",
    propSchema: {},
    content: "none",
    layoutOnly: true,
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

const createReactLayout = createReactBlockSpec(
  { type: "reactLayout", propSchema: {}, content: "none", layoutOnly: true },
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
      vanillaLayout: VanillaLayout(),
      reactContent: createReactContent(),
      reactFrame: createReactFrame(),
      reactLayout: createReactLayout(),
    },
  }),
);

function child(id: string) {
  return { id, type: "paragraph", content: id } as const;
}

describe("getBlockElementForNode", () => {
  it("finds the block's own element for every kind of block", async ({
    setupEditor,
  }) => {
    const { editor, rootNode } = await setupEditor({
      schema,
      skin: "raw",
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
          id: "vanillaLayout",
          type: "vanillaLayout",
          children: [child("vanillaLayoutChild")],
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
          id: "reactLayout",
          type: "reactLayout",
          children: [child("reactLayoutChild")],
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
      ],
    });
    await expect
      .poll(() => rootNode.querySelector('section[data-id="reactLayout"]'))
      .not.toBeNull();

    // The lookup is expressed in view positions; exercise it against the real
    // editor view instead of stubbing nodeDOM.
    const view = editor.prosemirrorView;
    const doc = editor.transact((tr) => tr.doc);
    const found: string[] = [];
    doc.descendants((node, pos) => {
      if (!node.type.isInGroup("bnBlock")) {
        return true;
      }
      const id = node.attrs.id as string;
      const element = getBlockElementForNode(view, pos, id);
      expect(element, id).toBeDefined();
      expect(element!.getAttribute("data-id"), id).toBe(id);
      expect(element!.getAttribute("data-node-type"), id).toBe(node.type.name);
      // Another block's id finds nothing.
      expect(getBlockElementForNode(view, pos, "other"), id).toBeUndefined();
      found.push(id);
      return true;
    });
    expect(found).toHaveLength(22);
  });
});
