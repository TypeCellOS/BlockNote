/* eslint-disable react/globals -- Probe components expose hook results to assertions after render. */
import { BlockNoteSchema, defaultProps, getNodeById } from "@blocknote/core";
import { createReactBlockSpec, useNodeViewBlock } from "@blocknote/react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, vi } from "vite-plus/test";

import type { SetupEditor } from "../../../../tests/src/commands/browser/setupEditor.js";

/**
 * Branch-level coverage of the fallback `useNodeViewBlock` uses when a node
 * view's `getPos()` can't be trusted. See the `nodeViews` integration suite
 * for the browser reproduction of #2937.
 */

const createReproBlock = createReactBlockSpec(
  { type: "repro", propSchema: defaultProps, content: "inline" },
  { render: (props) => <p ref={props.contentRef} /> },
);

// A layout block, whose node view's node is itself the bnBlock, resolved
// directly instead of by position.
const createBoxBlock = createReactBlockSpec(
  {
    type: "box",
    propSchema: {},
    content: "none",
    layoutOnly: true,
  },
  { renderFrame: (props) => <div ref={props.slotRef} /> },
);

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { repro: createReproBlock(), box: createBoxBlock() },
});

let root: Root | undefined;
let div: HTMLDivElement;

async function setupProbeEditor(setupEditor: SetupEditor) {
  const { editor } = await setupEditor({
    mountType: false,
    schema,
    trailingBlock: false,
    initialContent: [
      { type: "paragraph", content: "first" },
      { type: "repro", content: "target block" },
      { type: "paragraph", content: "last" },
      { type: "box", children: [{ type: "paragraph", content: "inside" }] },
    ],
  });
  return editor;
}

beforeEach(() => {
  div = document.createElement("div");
  document.body.appendChild(div);
});

afterEach(() => {
  root?.unmount();
  root = undefined;
  document.body.removeChild(div);
  vi.restoreAllMocks();
});

/** Renders the hook once and returns what it resolved to. */
function renderHook(
  props: Parameters<typeof useNodeViewBlock>[0],
  initialBlock: typeof schema.Block,
) {
  let resolved!: ReturnType<typeof useNodeViewBlock>;

  function Probe() {
    resolved = useNodeViewBlock(props, initialBlock);
    return null;
  }

  root = createRoot(div);
  flushSync(() => {
    root!.render(<Probe />);
  });

  return resolved;
}

// Only the fields `useNodeViewBlock` reads. Built structurally so `tests`
// doesn't need a dependency on `@tiptap/react` just for its prop types. The
// `node` defaults to a regular (non-layout) block's node shape; layout block
// tests pass the real PM node instead.
function makeProps(
  editor: typeof schema.BlockNoteEditor,
  getPos: () => number | undefined,
  node?: unknown,
) {
  return {
    getPos,
    node: node ?? { type: { isInGroup: () => false } },
    view: { state: { doc: editor.transact((tr) => tr.doc) } },
  } as unknown as Parameters<typeof useNodeViewBlock>[0];
}

describe("useNodeViewBlock", () => {
  it("resolves from the position when it is valid", async ({ setupEditor }) => {
    const editor = await setupProbeEditor(setupEditor);
    const doc = editor.transact((tr) => tr.doc);
    const target = editor.document[1];
    // `getBlockFromPos` resolves the *parent* of the position, so the position
    // has to sit just inside the block container.
    const pos = getNodeById(target.id, doc)!.posBeforeNode + 1;
    const stale = { ...target, id: "some-other-id" };
    const resolved = renderHook(
      makeProps(editor, () => pos),
      stale,
    );

    expect(resolved.id).toBe(target.id);
    expect(resolved.type).toBe("repro");
  });

  it("falls back to the last known block when the position is out of range", async ({
    setupEditor,
  }) => {
    const editor = await setupProbeEditor(setupEditor);
    const doc = editor.transact((tr) => tr.doc);
    const lastKnown = editor.document[1];
    const resolved = renderHook(
      makeProps(editor, () => doc.content.size + 1000),
      lastKnown,
    );

    // Returned as-is rather than throwing.
    expect(resolved).toBe(lastKnown);
  });

  it("falls back to the last known block when the position is undefined", async ({
    setupEditor,
  }) => {
    const editor = await setupProbeEditor(setupEditor);
    const lastKnown = editor.document[1];
    const resolved = renderHook(
      makeProps(editor, () => undefined),
      lastKnown,
    );

    expect(resolved).toBe(lastKnown);
  });

  it("falls back to the last known block when the position resolves to the wrong node", async ({
    setupEditor,
  }) => {
    const editor = await setupProbeEditor(setupEditor);
    const lastKnown = editor.document[1];
    // In range, but resolves to the doc rather than a block container — the
    // shape that a bounds check alone would not have caught.
    const resolved = renderHook(
      makeProps(editor, () => 0),
      lastKnown,
    );

    expect(resolved).toBe(lastKnown);
  });

  it("keeps the last successfully resolved block, not the seed", async ({
    setupEditor,
  }) => {
    const editor = await setupProbeEditor(setupEditor);
    const doc = editor.transact((tr) => tr.doc);
    const target = editor.document[1];
    const pos = getNodeById(target.id, doc)!.posBeforeNode + 1;
    const seed = { ...target, id: "stale-seed" };
    let positions = [pos, doc.content.size + 1000];
    let resolved!: ReturnType<typeof useNodeViewBlock>;

    function Probe() {
      resolved = useNodeViewBlock(
        makeProps(editor, () => positions[0]),
        seed,
      );
      return null;
    }

    root = createRoot(div);
    flushSync(() => {
      root!.render(<Probe />);
    });
    expect(resolved.id).toBe(target.id);

    // Re-render with a position that no longer resolves: it must fall back to
    // what it resolved last time, not to the seed it started with.
    positions = positions.slice(1);
    flushSync(() => {
      root!.render(<Probe />);
    });

    expect(resolved.id).toBe(target.id);
    expect(resolved).not.toBe(seed);
  });

  it("resolves layout blocks directly without consulting their position", async ({
    setupEditor,
  }) => {
    const editor = await setupProbeEditor(setupEditor);
    const box = editor.document.find((block) => block.type === "box")!;
    const { node } = editor.transact(({ doc }) => getNodeById(box.id, doc))!;
    const getPos = vi.fn(() => undefined);
    const resolved = renderHook(
      makeProps(editor, getPos, node),
      editor.document[0],
    );

    expect(resolved).toEqual(box);
    expect(getPos).not.toHaveBeenCalled();
  });
});
