import { TextSelection } from "prosemirror-state";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { FormattingToolbarExtension } from "./FormattingToolbar.js";

// Runs in the desktop browser instances, where `isTouchDevice()` is false.
// The touch side is pinned in tests/src/end-to-end/mobile/mobileToolbar.test.tsx.

/** Resolves once the deferred focus settle has run (see attachUIFocusTracker). */
function settle() {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

describe("Formatting toolbar focus", () => {
  let editor: BlockNoteEditor<any, any, any>;
  let container: HTMLElement;
  let outside: HTMLInputElement;

  beforeEach(() => {
    outside = document.createElement("input");
    document.body.append(outside);

    // Nested like `BlockNoteView`: the mount element's parent is the
    // editor's boundary (see `isWithinEditor`).
    container = document.createElement("div");
    const mountPoint = document.createElement("div");
    container.append(mountPoint);
    document.body.append(container);
    editor = BlockNoteEditor.create({
      initialContent: [{ type: "paragraph", content: "Selected text" }],
    });
    editor.mount(mountPoint);
  });

  afterEach(() => {
    editor.unmount();
    container.remove();
    outside.remove();
  });

  it("keeps the selection and the toolbar across a blur", async () => {
    const toolbar = editor.getExtension(FormattingToolbarExtension)!;
    editor.focus();
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, 3, 11)),
    );
    expect(toolbar.store.state).toBe(true);

    outside.focus();
    await settle();
    expect(toolbar.store.state).toBe(false);

    editor.focus();
    await settle();
    expect(editor.transact((tr) => tr.selection.empty)).toBe(false);
    expect(toolbar.store.state).toBe(true);
  });
});
