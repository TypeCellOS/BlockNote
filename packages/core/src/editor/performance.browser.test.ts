import { Selection } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "./BlockNoteEditor.js";

const activeEditors: BlockNoteEditor[] = [];

afterEach(() => {
  while (activeEditors.length) {
    activeEditors.pop()!.unmount();
  }
});

/**
 * Performance regression tests for issue #2595:
 * Typing/echo lag with many blocks (~50k chars total).
 *
 * The root cause was several plugins performing O(n) full-document traversals
 * on every ProseMirror transaction, where n = total number of blocks.
 * The fix limits traversals to only the changed ranges.
 *
 * These tests measure how synchronous transaction processing (including view
 * updates, but not browser layout or paint) scales with the document size.
 */

function createEditorWithBlocks(
  blockCount: number,
  blockType: "heading" | "paragraph" | "numberedListItem" = "heading",
) {
  const editor = BlockNoteEditor.create({
    initialContent: Array.from({ length: blockCount }, (_, i) => ({
      type: blockType,
      content: `Block number ${i} with some text to simulate a real document`,
      ...(blockType === "heading" ? { props: { level: 1 } } : {}),
    })),
  });
  editor.mount(document.createElement("div"));
  activeEditors.push(editor);
  return editor;
}

describe("Performance: transactions in large documents (#2595)", () => {
  // Compare timing between a small and large document.
  // The timings include ProseMirror state, decoration mapping, and view work
  // in addition to BlockNote's plugins.
  // Keep the 50× size contrast without mounting thousands of extra DOM nodes.
  const SMALL = 50;
  const LARGE = 2500;
  const MIN_SAMPLE_MS = 8;

  function measureAvgInsertTime(
    editor: BlockNoteEditor,
    edge: "start" | "end",
  ) {
    const view = editor.prosemirrorView;
    const { doc } = view.state;
    const selection =
      edge === "start" ? Selection.atStart(doc) : Selection.atEnd(doc);
    const $edge = selection.$from;
    let pos = $edge.pos;
    const advance = edge === "end" ? 1 : 0;

    // Warm up and verify that the edit goes into the target textblock, rather
    // than fitting text into a new block at a structural boundary.
    expect($edge.parent.isTextblock).toBe(true);
    expect($edge.parentOffset).toBe(
      edge === "start" ? 0 : $edge.parent.content.size,
    );
    const warmup = view.state.tr.setSelection(selection).insertText("w", pos);
    const edited = warmup.doc.resolve(pos).parent;
    expect(edited.sameMarkup($edge.parent)).toBe(true);
    expect(edited.textContent).toBe(
      edge === "start"
        ? `w${$edge.parent.textContent}`
        : `${$edge.parent.textContent}w`,
    );
    expect(warmup.doc.nodeSize).toBe(doc.nodeSize + 1);
    view.dispatch(warmup);
    pos += advance;

    // A short batch can read as 0ms on a coarse clock (notably WebKit).
    // Measure more of the same work rather than rounding up the denominator.
    for (let iterations = 5; iterations <= 320; iterations *= 2) {
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        view.dispatch(view.state.tr.insertText("x", pos));
        pos += advance;
      }
      const elapsed = performance.now() - start;
      if (elapsed >= MIN_SAMPLE_MS) {
        return elapsed / iterations;
      }
    }
    throw new Error("Could not resolve the insertion benchmark on this clock");
  }

  it("heading blocks: typing at end", { timeout: 30_000 }, () => {
    const smallEditor = createEditorWithBlocks(SMALL, "heading");
    const largeEditor = createEditorWithBlocks(LARGE, "heading");

    const smallAvg = measureAvgInsertTime(smallEditor, "end");
    const largeAvg = measureAvgInsertTime(largeEditor, "end");
    const ratio = largeAvg / smallAvg;

    // Ratio scales roughly linearly with block count due to ProseMirror
    // DOM update costs. Keep the ratio below the 50× block-count contrast.
    expect(
      ratio,
      `heading insert: ${smallAvg}ms vs ${largeAvg}ms`,
    ).toBeLessThan(50);
  });

  it("numbered list items: typing at both ends", { timeout: 30_000 }, () => {
    const smallEditor = createEditorWithBlocks(SMALL, "numberedListItem");
    const largeEditor = createEditorWithBlocks(LARGE, "numberedListItem");

    const smallAvg = measureAvgInsertTime(smallEditor, "start");
    const largeAvg = measureAvgInsertTime(largeEditor, "start");
    const ratio = largeAvg / smallAvg;

    // The two edges exercise different paths: the beginning can stop at the
    // first unchanged index, whereas the end has to find the last item's index
    // from its predecessors. The first edit didn't change the list structure.
    const smallEndAvg = measureAvgInsertTime(smallEditor, "end");
    const largeEndAvg = measureAvgInsertTime(largeEditor, "end");
    const endRatio = largeEndAvg / smallEndAvg;

    // Leave room for ProseMirror's own decoration mapping and view updates.
    expect(
      ratio,
      `typing at the beginning: ${smallAvg}ms vs ${largeAvg}ms`,
    ).toBeLessThan(250);
    expect(
      endRatio,
      `typing at the end: ${smallEndAvg}ms vs ${largeEndAvg}ms`,
    ).toBeLessThan(250);
  });

  // getChanges() is lazy — it only diffs when a subscriber calls it, so the tests
  // above don't cover getBlocksChangedByTransaction. This locks in that the diff
  // scopes to the changed range, not the whole document.
  it(
    "getChanges() in onChange scales sub-linearly",
    { timeout: 30_000 },
    () => {
      function measureWithGetChanges(editor: BlockNoteEditor) {
        const editedBlock = editor.document.at(-1)!;
        let observed = false;
        const observe = editor.onChange((_editor, changes) => {
          expect(
            changes
              .getChanges()
              .map(({ type, block }) => ({ type, id: block.id })),
          ).toEqual([{ type: "update", id: editedBlock.id }]);
          observed = true;
        });
        try {
          editor.setTextCursorPosition(editedBlock, "end");
          editor.insertInlineContent("control");
          expect(observed).toBe(true);
        } finally {
          observe();
        }

        // Run the diff every transaction, like an app reading changed blocks per keystroke.
        // eslint-disable-next-line @typescript-eslint/unbound-method -- getChanges is destructured from callback parameter, not a class
        const unsubscribe = editor.onChange((_editor, { getChanges }) => {
          getChanges();
        });
        try {
          return measureAvgInsertTime(editor, "end");
        } finally {
          unsubscribe();
        }
      }

      const smallEditor = createEditorWithBlocks(SMALL, "paragraph");
      const largeEditor = createEditorWithBlocks(LARGE, "paragraph");

      const smallAvg = measureWithGetChanges(smallEditor);
      const largeAvg = measureWithGetChanges(largeEditor);
      const ratio = largeAvg / smallAvg;

      // The full-document snapshot made getChanges O(blocks) per keystroke, pushing
      // this toward the block-count ratio (~50x); the ranged diff stays well below.
      expect(ratio, `getChanges: ${smallAvg}ms vs ${largeAvg}ms`).toBeLessThan(
        50,
      );
    },
  );
});
