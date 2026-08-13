import {
  BlockNoteEditor,
  BlockNoteSchema,
  createBlockSpec,
  defaultProps,
} from "@blocknote/core";
import { BlockNoteViewRaw, createReactBlockSpec } from "@blocknote/react";
import { useLayoutEffect } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

/**
 * Regression tests for #2937 (and the same family: #2682, #2621).
 *
 * A React node view resolves its block from `getPos()`, which ProseMirror
 * derives from its view-desc tree. `EditorView.updateStateInner` assigns the
 * new state *before* it reconciles that tree, so anything rendering part-way
 * through reconciliation reads a position that doesn't line up with
 * `view.state.doc`. Resolving it then threw out of the render path, which under
 * React 19 tears down the consumer's tree rather than being rethrown.
 */

// Set by a test to make a newly mounted node view dispatch a transaction from
// its layout effect, i.e. re-entrantly during ProseMirror's reconciliation.
let onMount: ((blockId: string, text: string) => void) | undefined;

// Whether each node view render resolved to a block that was actually in the
// document *at the time it rendered*. Proves the recovery path ran without
// relying on a log line: a successful resolve always yields a block from the
// current document, whereas core's fallback builds one from the node alone
// under a freshly generated id that belongs to no block at all.
let renderedFromFallbackCount = 0;

function noteRender(id: string, ed: BlockNoteEditor<any, any, any>) {
  let found = false;
  ed.prosemirrorState.doc.descendants((node) => {
    found ||= node.attrs.id === id;
    return !found;
  });
  if (!found) {
    renderedFromFallbackCount++;
  }
}

// Typed structurally rather than with `ReactCustomBlockRenderProps`, whose
// `contentRef` is conditional on the block config's `content` type and so
// doesn't resolve through `any`.
function ReproComponent(props: {
  block: { id: string; content?: unknown };
  editor: BlockNoteEditor<any, any, any>;
  contentRef: (element: HTMLElement | null) => void;
}) {
  const { id, content } = props.block;
  const text =
    Array.isArray(content) && content[0]?.type === "text"
      ? content[0].text
      : "";

  noteRender(id, props.editor);

  useLayoutEffect(() => {
    onMount?.(id, text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return <p ref={props.contentRef} className="repro-block" />;
}

const createFillerBlock = createBlockSpec(
  { type: "filler", propSchema: defaultProps, content: "inline" },
  {
    render(block, editor) {
      noteRender(block.id, editor as BlockNoteEditor<any, any, any>);
      const dom = document.createElement("p");
      return { dom, contentDOM: dom };
    },
  },
);

const createReproBlock = createReactBlockSpec(
  {
    type: "repro",
    propSchema: defaultProps,
    content: "inline",
  },
  { render: ReproComponent },
);

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { repro: createReproBlock(), filler: createFillerBlock() },
});

type ReproEditor = BlockNoteEditor<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;

let root: Root | undefined;
let div: HTMLDivElement | undefined;
let editor: ReproEditor | undefined;
/** Render-phase errors. React 19 reports rather than rethrows these. */
let uncaught: unknown[] = [];

function paragraphs(count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => ({
    type: "filler" as const,
    content: `${prefix} ${i} — filler text so the document has real size`,
  }));
}

function mountEditor(initialContent: any[]): ReproEditor {
  div = document.createElement("div");
  document.body.appendChild(div);

  editor = BlockNoteEditor.create({
    schema,
    trailingBlock: false,
    initialContent,
  }) as ReproEditor;

  uncaught = [];
  renderedFromFallbackCount = 0;
  root = createRoot(div, {
    onUncaughtError: (error) => uncaught.push(error),
    onCaughtError: (error) => uncaught.push(error),
  });

  flushSync(() => {
    root!.render(<BlockNoteViewRaw editor={editor as any} />);
  });

  // TipTap's `ReactRenderer` only renders a node view synchronously (via
  // `flushSync`) when `isEditorContentInitialized` is set; otherwise it defers
  // to a microtask. TipTap's own `PureEditorContent` sets it, but BlockNote
  // replaces that component with its own mounting (`BlockNoteView.tsx`) and
  // never does, so BlockNote currently gets the deferred path by accident.
  // Set it here so node views mount the way they do for every other TipTap
  // React user — and the way they do for anyone resolving `@tiptap/react`
  // below 3.22, where this flag was still the always-true `isInitialized`.
  // That is the configuration #2937 was reported against.
  (editor as any)._tiptapEditor.isEditorContentInitialized = true;

  return editor;
}

afterEach(() => {
  onMount = undefined;
  root?.unmount();
  root = undefined;
  if (div) {
    document.body.removeChild(div);
    div = undefined;
  }
  editor?._tiptapEditor.destroy();
  editor = undefined;
  vi.restoreAllMocks();
});

/** Collects everything that went wrong during an action, however it surfaced. */
function runCapturingErrors(action: () => void): string[] {
  const errors: unknown[] = [];
  const onWindowError = (e: ErrorEvent) => errors.push(e.error ?? e.message);
  window.addEventListener("error", onWindowError);
  try {
    action();
  } catch (e) {
    errors.push(e);
  } finally {
    window.removeEventListener("error", onWindowError);
  }
  errors.push(...uncaught);
  uncaught = [];
  return errors.map(String);
}

const MARKER = "newly mounted repro block";

describe("stale node view getPos (#2937)", () => {
  it("shrinking the doc while mounting a node view resolves normally", () => {
    const ed = mountEditor([
      ...paragraphs(30, "head"),
      { type: "repro", content: "existing repro block" },
      ...paragraphs(10, "tail"),
    ]);
    const errors = runCapturingErrors(() => {
      ed.replaceBlocks(ed.document.slice(0, 28), [
        { type: "repro", content: MARKER } as any,
      ]);
    });

    expect(errors).toEqual([]);
    // The straightforward case must not go anywhere near the fallback.
    expect(renderedFromFallbackCount).toBe(0);
  });

  it("recovers when a node view dispatches re-entrantly from its mount effect", () => {
    const ed = mountEditor([
      ...paragraphs(30, "head"),
      { type: "repro", content: "existing repro block" },
      ...paragraphs(10, "tail"),
    ]);
    let fired = false;
    onMount = (_id, text) => {
      if (fired || text !== MARKER) {
        return;
      }
      fired = true;
      // Runs inside React's commit phase, which is inside the `flushSync` in
      // TipTap's `ReactRenderer` constructor, which is inside ProseMirror's
      // `updateChildren`. Node views built or rendered from here see a
      // `getPos()` computed against a half-updated view-desc tree.
      ed.removeBlocks(ed.document.slice(-8));
    };

    const errors = runCapturingErrors(() => {
      ed.replaceBlocks(ed.document.slice(0, 28), [
        { type: "repro", content: MARKER } as any,
      ]);
    });

    expect(fired).toBe(true);
    // Before the fix this threw "Node should be a bnBlock, but is instead: doc"
    // out of the render path.
    expect(errors).toEqual([]);
    // Guards against this silently ceasing to exercise the recovery path: a
    // node view rendered the new block's content under an id that no block in
    // the document has, which only core's fallback produces.
    expect(renderedFromFallbackCount).toBeGreaterThan(0);
    // The editor is still usable and shows the document it should.
    expect(ed.document.some((b) => b.type === "repro")).toBe(true);
  });

  it("recovers when a re-entrant dispatch empties most of the document", () => {
    const ed = mountEditor([
      ...paragraphs(40, "head"),
      { type: "repro", content: "existing repro block" },
      ...paragraphs(20, "tail"),
    ]);
    let fired = false;
    onMount = (_id, text) => {
      if (fired || text !== MARKER) {
        return;
      }
      fired = true;
      ed.removeBlocks(ed.document.slice(1));
    };

    const errors = runCapturingErrors(() => {
      ed.replaceBlocks(ed.document.slice(0, 35), [
        { type: "repro", content: MARKER } as any,
      ]);
    });

    expect(fired).toBe(true);
    expect(errors).toEqual([]);
    expect(renderedFromFallbackCount).toBeGreaterThan(0);
    expect(ed.document.length).toBe(1);
  });
});
