import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultProps,
  getNodeById,
} from "@blocknote/core";
import { createReactBlockSpec, useNodeViewBlock } from "@blocknote/react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

/**
 * Branch-level coverage of the fallback `useNodeViewBlock` uses when a node
 * view's `getPos()` can't be trusted. See `staleNodeViewPos.test.tsx` for the
 * end-to-end reproduction of #2937.
 */

const createReproBlock = createReactBlockSpec(
  { type: "repro", propSchema: defaultProps, content: "inline" },
  { render: (props) => <p ref={props.contentRef} /> },
);

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { repro: createReproBlock() },
});

let editor: BlockNoteEditor<any, any, any>;
let root: Root | undefined;
let div: HTMLDivElement;

beforeEach(() => {
  editor = BlockNoteEditor.create({
    schema,
    trailingBlock: false,
    initialContent: [
      { type: "paragraph", content: "first" },
      { type: "repro", content: "target block" },
      { type: "paragraph", content: "last" },
    ],
  }) as BlockNoteEditor<any, any, any>;

  div = document.createElement("div");
  document.body.appendChild(div);
});

afterEach(() => {
  root?.unmount();
  root = undefined;
  document.body.removeChild(div);
  editor._tiptapEditor.destroy();
  vi.restoreAllMocks();
});

/** Renders the hook once and returns what it resolved to. */
function renderHook(
  props: Parameters<typeof useNodeViewBlock>[0],
  initialBlock: any,
) {
  let resolved: any;

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

// Only the two fields `useNodeViewBlock` reads. Built structurally so `tests`
// doesn't need a dependency on `@tiptap/react` just for its prop types.
function makeProps(getPos: () => number | undefined) {
  return {
    getPos,
    view: { state: { doc: editor.prosemirrorState.doc } },
  } as unknown as Parameters<typeof useNodeViewBlock>[0];
}

describe("useNodeViewBlock", () => {
  it("resolves from the position when it is valid", () => {
    const doc = editor.prosemirrorState.doc;
    const target = editor.document[1];
    // `getBlockFromPos` resolves the *parent* of the position, so the position
    // has to sit just inside the block container.
    const pos = getNodeById(target.id, doc)!.posBeforeNode + 1;
    const stale = { ...target, id: "some-other-id" };
    const resolved = renderHook(
      makeProps(() => pos),
      stale,
    );

    expect(resolved.id).toBe(target.id);
    expect(resolved.type).toBe("repro");
  });

  it("falls back to the last known block when the position is out of range", () => {
    const doc = editor.prosemirrorState.doc;
    const lastKnown = editor.document[1];
    const resolved = renderHook(
      makeProps(() => doc.content.size + 1000),
      lastKnown,
    );

    // Returned as-is rather than throwing.
    expect(resolved).toBe(lastKnown);
  });

  it("falls back to the last known block when the position is undefined", () => {
    const lastKnown = editor.document[1];
    const resolved = renderHook(
      makeProps(() => undefined),
      lastKnown,
    );

    expect(resolved).toBe(lastKnown);
  });

  it("falls back to the last known block when the position resolves to the wrong node", () => {
    const lastKnown = editor.document[1];
    // In range, but resolves to the doc rather than a block container — the
    // shape that a bounds check alone would not have caught.
    const resolved = renderHook(
      makeProps(() => 0),
      lastKnown,
    );

    expect(resolved).toBe(lastKnown);
  });

  it("keeps the last successfully resolved block, not the seed", () => {
    const doc = editor.prosemirrorState.doc;
    const target = editor.document[1];
    const pos = getNodeById(target.id, doc)!.posBeforeNode + 1;
    const seed = { ...target, id: "stale-seed" };
    let positions = [pos, doc.content.size + 1000];
    let resolved: any;

    function Probe() {
      resolved = useNodeViewBlock(
        makeProps(() => positions[0]),
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
});
