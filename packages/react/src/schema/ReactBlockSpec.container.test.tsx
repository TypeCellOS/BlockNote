/**
 * @vitest-environment node
 *
 * Document-level tests for React container blocks. Every assertion here reads
 * `editor.document`, so there is nothing to render and no DOM to need — the
 * node environment keeps that honest. The DOM output (serialized HTML and the
 * live node view) is covered by `ReactBlockSpec.container.browser.test.tsx`.
 */
import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import { createReactBlockSpec } from "./ReactBlockSpec.js";

// Same shape as the example callout block (`examples/06-custom-schema/09-container-block`).
const Callout = createReactBlockSpec(
  {
    type: "callout" as const,
    propSchema: {},
    content: "none" as const,
    children: { allow: "any", default: [{ type: "paragraph" }] },
  },
  {
    render: ({ contentRef }) => (
      <div className="callout">
        <div className="callout-body" ref={contentRef} />
      </div>
    ),
  },
)();

// The additivity claim: adding `children` to an existing block is one config
// line and *zero* render changes. Both blocks below share this render, which is
// the shape every inline-content React block already has — `contentRef` on a
// plain div. `Alert` is `examples/06-custom-schema/01-alert-block` reduced to
// its structure; `AlertWithBody` is the same block with `children` added.
const renderAlert = ({ contentRef }: { contentRef: (el: any) => void }) => (
  <div className="alert">
    <div className="alert-icon-wrapper" contentEditable={false} />
    <div className="inline-content" ref={contentRef} />
  </div>
);

const Alert = createReactBlockSpec(
  {
    type: "alert" as const,
    propSchema: { flavor: { default: "warning" } },
    content: "inline" as const,
  },
  { render: renderAlert },
)();

const AlertWithBody = createReactBlockSpec(
  {
    type: "alertWithBody" as const,
    propSchema: { flavor: { default: "warning" } },
    content: "inline" as const,
    children: { allow: "any" },
  },
  { render: renderAlert },
)();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: Callout,
    alert: Alert,
    alertWithBody: AlertWithBody,
  } as const,
});

const defaultParagraphProps = {
  backgroundColor: "default",
  textAlignment: "left",
  textColor: "default",
};

/**
 * The document without block ids. Converting a block generates fresh ids, and
 * core's deterministic test-id hook (`UniqueID`'s `generateID`) only kicks in
 * when a `window` exists — under node it falls back to real UUIDs. Ids that
 * matter are asserted individually.
 */
const withoutIds = (blocks: any[]): any[] =>
  blocks.map(({ id: _id, children, ...rest }) => ({
    ...rest,
    children: withoutIds(children),
  }));

describe("React updateBlock → container with `default` (document-level)", () => {
  const editor = BlockNoteEditor.create({ schema });

  beforeEach(() => {
    editor.replaceBlocks(editor.document, [
      { id: "p-0", type: "paragraph", content: "" },
      { id: "trailing", type: "paragraph", content: "" },
    ]);
  });

  it("converts an empty paragraph to a callout via editor.updateBlock", () => {
    editor.updateBlock("p-0", { type: "callout" });

    expect(withoutIds(editor.document)).toEqual([
      {
        type: "callout",
        props: {},
        // `content: "none"`, so the block has no inline content of its own —
        // and the `children.default` seeded it exactly one empty paragraph.
        content: undefined,
        children: [
          {
            type: "paragraph",
            props: defaultParagraphProps,
            content: [],
            children: [],
          },
        ],
      },
      {
        type: "paragraph",
        props: defaultParagraphProps,
        content: [],
        children: [],
      },
    ]);
    // The block that wasn't converted keeps its identity.
    expect(editor.document[1].id).toBe("trailing");
  }, 5000);
});

// The plan's headline claim: `children` is additive. Adding it to a block gives
// that block a body without touching its `render` — the block's `contentRef`
// element goes from holding just its inline content to holding its inline
// content followed by its child blocks.
describe("adding `children` to an existing block", () => {
  const editor = BlockNoteEditor.create({ schema });

  it("keeps the block without `children` unchanged", () => {
    editor.replaceBlocks(editor.document, [
      { id: "a-0", type: "alert", content: "Heads up" },
    ] as any);

    const block = editor.getBlock("a-0")!;
    expect(block.content).toEqual([
      { type: "text", text: "Heads up", styles: {} },
    ]);
    expect(block.children).toEqual([]);
  }, 5000);

  it("gains a body that accepts child blocks, with the same render", () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "b-0",
        type: "alertWithBody",
        content: "Heads up",
        children: [{ id: "b-child", type: "paragraph", content: "Details" }],
      },
    ] as any);

    const block = editor.getBlock("b-0")!;
    expect(block.content).toEqual([
      { type: "text", text: "Heads up", styles: {} },
    ]);
    expect(block.children.map((child) => child.id)).toEqual(["b-child"]);
    // The child is an ordinary block of the document, reachable by id.
    expect(editor.getBlock("b-child")).toBeDefined();
  }, 5000);

  it("seeds a body when inserted without children", () => {
    editor.replaceBlocks(editor.document, [
      { id: "c-0", type: "alertWithBody", content: "Heads up" },
    ] as any);

    expect(editor.getBlock("c-0")!.children).toHaveLength(1);
  }, 5000);
});
