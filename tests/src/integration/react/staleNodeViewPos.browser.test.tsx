import {
  BlockNoteSchema,
  createBlockSpec,
  defaultProps,
} from "@blocknote/core";
import { BlockNoteViewRaw, createReactBlockSpec } from "@blocknote/react";
import { useLayoutEffect } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, vi } from "vite-plus/test";
import type { getContentComponent } from "../../../../packages/react/src/editor/EditorContent.js";

import type { SetupEditor } from "../../commands/browser/setupEditor.js";

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

type BlockLookup = { getBlock(id: string): unknown };

function noteRender(id: string, editor: BlockLookup) {
  if (!editor.getBlock(id)) {
    renderedFromFallbackCount++;
  }
}

function ReproComponent(props: {
  block: { id: string; content?: unknown };
  editor: BlockLookup;
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
      noteRender(block.id, editor);
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

let root: Root | undefined;
let div: HTMLDivElement | undefined;
let restorePortalRegistration: (() => void) | undefined;
/** Render-phase errors. React 19 reports rather than rethrows these. */
let uncaught: unknown[] = [];

function paragraphs(count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => ({
    type: "filler" as const,
    content: `${prefix} ${i} — filler text so the document has real size`,
  }));
}

async function mountEditor(
  setupEditor: SetupEditor,
  initialContent: (typeof schema.PartialBlock)[],
) {
  div = document.createElement("div");
  document.body.appendChild(div);

  const { editor } = await setupEditor({
    mountType: false,
    schema,
    trailingBlock: false,
    initialContent,
  });

  uncaught = [];
  renderedFromFallbackCount = 0;
  root = createRoot(div, {
    onUncaughtError: (error) => uncaught.push(error),
    onCaughtError: (error) => uncaught.push(error),
  });

  flushSync(() => {
    root!.render(<BlockNoteViewRaw editor={editor} />);
  });
  // Wrap this editor's actual portal manager. Import-level mocks cannot
  // replace an export that an earlier test already loaded in a reused iframe.
  const tiptap = editor._tiptapEditor;
  const portalManager: ReturnType<typeof getContentComponent> | undefined =
    tiptap.contentComponent;
  if (!portalManager) {
    throw new Error("Expected the mounted editor to have a portal manager");
  }
  const setRenderer = portalManager.setRenderer.bind(portalManager);
  const registration = vi.spyOn(portalManager, "setRenderer");
  const wasInitialized = tiptap.isEditorContentInitialized;
  restorePortalRegistration = () => {
    registration.mockRestore();
    tiptap.isEditorContentInitialized = wasInitialized;
  };
  registration.mockImplementation((...args) => {
    flushSync(() => setRenderer(...args));
  });
  // Disable TipTap's initial deferral so the portal reaches the registration
  // boundary above while ProseMirror is still reconciling.
  tiptap.isEditorContentInitialized = true;

  return editor;
}

afterEach(() => {
  onMount = undefined;
  try {
    restorePortalRegistration?.();
    // Detach the editor host so TipTap can release its stylesheet on unmount.
    div?.remove();
    root?.unmount();
  } finally {
    root = undefined;
    div = undefined;
    restorePortalRegistration = undefined;
  }
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

function runReentrantAction(action: () => void) {
  // The fixture forces a synchronous portal render even during React's commit
  // phase. Expect only that artificial diagnostic; other errors still log.
  const diagnostic =
    "flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task.";
  // eslint-disable-next-line no-console
  const reportError = console.error;
  const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
    if (args.length !== 1 || args[0] !== diagnostic) {
      reportError(...args);
    }
  });
  try {
    const errors = runCapturingErrors(action);
    expect(spy).toHaveBeenCalledWith(diagnostic);
    return errors;
  } finally {
    spy.mockRestore();
  }
}

const MARKER = "newly mounted repro block";

describe("stale node view getPos (#2937)", () => {
  it("does not use the stale-position fallback when the same mount-effect edit is deferred", async ({
    setupEditor,
  }) => {
    const editor = await mountEditor(setupEditor, [
      ...paragraphs(30, "head"),
      { type: "repro", content: "existing repro block" },
      ...paragraphs(10, "tail"),
    ]);
    let mounted = false;
    let deferredEdit: Promise<void> | undefined;
    onMount = (_id, text) => {
      if (!mounted && text === MARKER) {
        mounted = true;
        deferredEdit = Promise.resolve().then(() => {
          editor.removeBlocks(editor.document.slice(-8));
        });
      }
    };

    editor.replaceBlocks(editor.document.slice(0, 28), [
      { type: "repro", content: MARKER },
    ]);

    expect(mounted).toBe(true);
    expect(editor.document).toHaveLength(14);
    await deferredEdit;
    expect(editor.document).toHaveLength(6);
    expect(renderedFromFallbackCount).toBe(0);
    expect(uncaught).toEqual([]);
  });

  it("shrinking the doc while mounting a node view resolves normally", async ({
    setupEditor,
  }) => {
    const ed = await mountEditor(setupEditor, [
      ...paragraphs(30, "head"),
      { type: "repro", content: "existing repro block" },
      ...paragraphs(10, "tail"),
    ]);
    let mounted = false;
    onMount = (_id, text) => {
      mounted ||= text === MARKER;
    };
    const errors = runCapturingErrors(() => {
      ed.replaceBlocks(ed.document.slice(0, 28), [
        { type: "repro", content: MARKER },
      ]);
    });

    // Even the non-reentrant control must actually mount during the command.
    expect(mounted).toBe(true);
    expect(errors).toEqual([]);
    // The straightforward case must not go anywhere near the fallback.
    expect(renderedFromFallbackCount).toBe(0);
  });

  it("recovers when a node view dispatches re-entrantly from its mount effect", async ({
    setupEditor,
  }) => {
    const ed = await mountEditor(setupEditor, [
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
      // Runs inside React's commit phase, which is inside the test's
      // synchronous portal registration, which is inside ProseMirror's
      // `updateChildren`. Node views built or rendered from here see a
      // `getPos()` computed against a half-updated view-desc tree.
      ed.removeBlocks(ed.document.slice(-8));
    };

    const errors = runReentrantAction(() => {
      ed.replaceBlocks(ed.document.slice(0, 28), [
        { type: "repro", content: MARKER },
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

  it("recovers when a re-entrant dispatch empties most of the document", async ({
    setupEditor,
  }) => {
    const ed = await mountEditor(setupEditor, [
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

    const errors = runReentrantAction(() => {
      ed.replaceBlocks(ed.document.slice(0, 35), [
        { type: "repro", content: MARKER },
      ]);
    });

    expect(fired).toBe(true);
    expect(errors).toEqual([]);
    expect(renderedFromFallbackCount).toBeGreaterThan(0);
    expect(ed.document.length).toBe(1);
  });
});
