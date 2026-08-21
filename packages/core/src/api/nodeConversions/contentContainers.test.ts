// @vitest-environment node
import type { Node, Schema } from "@tiptap/pm/model";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "../../schema/blocks/createSpec.js";
import {
  getBottomNestedBlockInfo,
  getPrevBlockInfo,
} from "../blockManipulation/commands/mergeBlocks/mergeBlocks.js";
import { getBlockInfoWithManualOffset } from "../getBlockInfoFromPos.js";
import { blockToNode } from "./blockToNode.js";
import { nodeToBlock } from "./nodeToBlock.js";

// A container block with its own inline content: the toggle shape. Its node
// holds a generated content node and a generated children node, so its
// `Block` JSON is identical to a nested regular block's.
// This suite works on nodes and a headless editor's schema, so nothing is
// rendered. `render` only has to exist for the spec to be accepted.
const notRendered = () => {
  throw new Error("not rendered in this suite");
};

const Toggle = createBlockSpec(
  {
    type: "toggle" as const,
    propSchema: { open: { default: true } },
    content: "inline",
    children: { allow: "any" },
  },
  { render: notRendered },
)();

// The same, but allowed to have no children at all.
const OptionalToggle = createBlockSpec(
  {
    type: "optionalToggle" as const,
    propSchema: {},
    content: "inline",
    children: { allow: "any", min: 0 },
  },
  { render: notRendered },
)();

// A pure container, to pair each content-bearing container against.
const containerSpec = <TName extends string>(
  type: TName,
  config: { content: "none" | "inline"; children: any; placement?: any },
) =>
  createBlockSpec(
    {
      type,
      propSchema: {},
      ...config,
    } as any,
    { render: notRendered },
  )();

// Pairs of (pure container, content-bearing container) sharing one `children`
// config. Their content expressions must match. The same generator runs for
// both, so every `allow`/`min`/`max` option enforces identically.
const CHILDREN_CONFIGS = {
  Default: { allow: "any" },
  Bounded: { allow: "any", min: 0, max: 3 },
  Restricted: { allow: ["cell"], min: 2 },
} as const;

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    toggle: Toggle,
    optionalToggle: OptionalToggle,
    cell: containerSpec("cell", {
      content: "none",
      children: { allow: "any" },
    }),
    pureDefault: containerSpec("pureDefault", {
      content: "none",
      children: CHILDREN_CONFIGS.Default,
    }),
    contentDefault: containerSpec("contentDefault", {
      content: "inline",
      children: CHILDREN_CONFIGS.Default,
    }),
    pureBounded: containerSpec("pureBounded", {
      content: "none",
      children: CHILDREN_CONFIGS.Bounded,
    }),
    contentBounded: containerSpec("contentBounded", {
      content: "inline",
      children: CHILDREN_CONFIGS.Bounded,
    }),
    pureRestricted: containerSpec("pureRestricted", {
      content: "none",
      children: CHILDREN_CONFIGS.Restricted,
    }),
    contentRestricted: containerSpec("contentRestricted", {
      content: "inline",
      children: CHILDREN_CONFIGS.Restricted,
    }),
  } as const,
});

let editor: BlockNoteEditor<any, any, any>;
let pmSchema: Schema;

beforeAll(() => {
  editor = BlockNoteEditor.create({ schema }) as any;
  pmSchema = editor.pmSchema;
});

afterAll(() => {
  editor._tiptapEditor.destroy();
  editor = undefined as any;
});

// `nodeToBlock(node, doc)` takes the containing document as its second
// argument, so blocks built in isolation need a minimal valid doc around them.
const wrapInDoc = (...blocks: Node[]): Node =>
  pmSchema.nodes["doc"].createChecked(
    null,
    pmSchema.nodes["blockGroup"].createChecked(null, blocks),
  );

describe("content-bearing container: node shape", () => {
  it("builds a content node and a children node inside the block's node", () => {
    const node = blockToNode(
      {
        id: "t-0",
        type: "toggle",
        props: { open: false },
        content: "Title",
        children: [{ id: "c-0", type: "paragraph", content: "Child" }],
      } as any,
      pmSchema,
    );

    expect(node.type.name).toBe("toggle");
    expect(node.type.isInGroup("bnBlock")).toBe(true);
    expect(node.type.isInGroup("blockGroupChild")).toBe(true);
    // The block's node is not itself a child container. The generated
    // children node is.
    expect(node.type.isInGroup("childContainer")).toBe(false);
    // All props (and the id) live on the outer node, not the generated ones.
    expect(node.attrs.id).toBe("t-0");
    expect(node.attrs.open).toBe(false);

    expect(node.childCount).toBe(2);

    const contentNode = node.child(0);
    expect(contentNode.type.name).toBe("toggle__content");
    expect(contentNode.type.isInGroup("containerContent")).toBe(true);
    // Deliberately not in `blockContent`. `blockContainer` accepts that
    // group, so a paste could otherwise produce
    // `blockContainer > toggle__content`.
    expect(contentNode.type.isInGroup("blockContent")).toBe(false);
    expect(contentNode.textContent).toBe("Title");
    expect("open" in contentNode.attrs).toBe(false);
    expect("id" in contentNode.attrs).toBe(false);

    const childrenNode = node.child(1);
    expect(childrenNode.type.name).toBe("toggle__children");
    expect(childrenNode.type.isInGroup("childContainer")).toBe(true);
    expect(childrenNode.childCount).toBe(1);
    expect(childrenNode.child(0).type.name).toBe("blockContainer");

    expect(() => node.check()).not.toThrow();
  });
});

describe("content-bearing container: Block JSON", () => {
  it("round-trips identically to a nested regular block", () => {
    const toggleNode = blockToNode(
      {
        id: "b-0",
        type: "toggle",
        content: "Title",
        children: [{ id: "c-0", type: "paragraph", content: "Child" }],
      } as any,
      pmSchema,
    );
    const paragraphNode = blockToNode(
      {
        id: "b-0",
        type: "paragraph",
        content: "Title",
        children: [{ id: "c-0", type: "paragraph", content: "Child" }],
      } as any,
      pmSchema,
    );

    const toggleBlock = nodeToBlock(toggleNode, wrapInDoc(toggleNode));
    const paragraphBlock = nodeToBlock(paragraphNode, wrapInDoc(paragraphNode));

    // Everything but the block's own type and props is structurally identical
    // to the nested paragraph's.
    const { type: _toggleType, props: _toggleProps, ...toggle } = toggleBlock;
    const {
      type: _paragraphType,
      props: _paragraphProps,
      ...paragraph
    } = paragraphBlock;
    expect(toggle).toEqual(paragraph);

    expect(toggleBlock).toEqual({
      id: "b-0",
      type: "toggle",
      props: { open: true },
      content: [{ type: "text", text: "Title", styles: {} }],
      children: [
        {
          id: "c-0",
          type: "paragraph",
          props: (paragraphBlock.children as any[])[0].props,
          content: [{ type: "text", text: "Child", styles: {} }],
          children: [],
        },
      ],
    });
  });

  it("round-trips an empty container with no content", () => {
    const node = blockToNode(
      { id: "t-0", type: "optionalToggle", children: [] } as any,
      pmSchema,
    );
    const block = nodeToBlock(node, wrapInDoc(node));

    expect(block.content).toEqual([]);
    expect(block.children).toEqual([]);
  });
});

describe("content-bearing container: BlockInfo", () => {
  it("is a wrapped block, with the content and children nodes resolved", () => {
    const node = blockToNode(
      {
        id: "t-0",
        type: "toggle",
        content: "Title",
        children: [{ id: "c-0", type: "paragraph", content: "Child" }],
      } as any,
      pmSchema,
    );

    const info = getBlockInfoWithManualOffset(node, 0);

    // Structurally identical to a `blockContainer`, so every keyboard branch
    // written against one covers this too.
    expect(info.isWrappedBlock).toBe(true);
    expect(info.blockContent!.node.type.name).toBe("toggle__content");
    expect(info.childContainer!.node.type.name).toBe("toggle__children");
    // The type comes from the outer node. A `blockContainer` is a generic
    // wrapper, but a container block is its own type.
    expect(info.blockNoteType).toBe("toggle");

    // Positions are those of the nodes themselves.
    expect(info.bnBlock.beforePos).toBe(0);
    expect(info.blockContent!.beforePos).toBe(1);
    expect(info.blockContent!.afterPos).toBe(1 + node.child(0).nodeSize);
    expect(info.childContainer!.beforePos).toBe(1 + node.child(0).nodeSize);
  });

  it("handles a container with zero children", () => {
    const paragraphNode = blockToNode(
      { id: "p-0", type: "paragraph", content: "Before" } as any,
      pmSchema,
    );
    const toggleNode = blockToNode(
      {
        id: "t-0",
        type: "optionalToggle",
        content: "Title",
        children: [],
      } as any,
      pmSchema,
    );
    const doc = wrapInDoc(paragraphNode, toggleNode);

    const togglePos = 1 + paragraphNode.nodeSize;
    const info = getBlockInfoWithManualOffset(toggleNode, togglePos);
    expect(info.childContainer!.node.childCount).toBe(0);

    // An empty child container has no last child to descend into, so the
    // block itself is the bottom one.
    expect(() => getBottomNestedBlockInfo(doc, info)).not.toThrow();
    expect(getBottomNestedBlockInfo(doc, info).bnBlock.node).toBe(toggleNode);

    expect(() => getPrevBlockInfo(doc, togglePos)).not.toThrow();
    expect(getPrevBlockInfo(doc, togglePos)!.blockNoteType).toBe("paragraph");
  });
});

describe("content-bearing container: children content expression", () => {
  it.each(Object.keys(CHILDREN_CONFIGS))(
    "%s compiles the same as it does for a pure container",
    (name) => {
      const pure = pmSchema.nodes[`pure${name}`];
      const contentBearing = pmSchema.nodes[`content${name}__children`];

      expect(contentBearing).toBeDefined();
      expect(contentBearing.spec.content).toBe(pure.spec.content);
    },
  );
});
