import { describe, expect } from "vite-plus/test";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { FormattingToolbarExtension } from "./FormattingToolbar.js";

// Runs in the desktop browser instances, where `isTouchDevice()` is false.
// The touch side is pinned in tests/src/end-to-end/mobile/mobileToolbar.test.tsx.

/** Queue behind any focusout check scheduled by attachUIFocusTracker. */
function afterFocusoutCheck() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("Formatting toolbar focus", () => {
  const it = globalThis.it.extend<{
    focusFixture: { editor: BlockNoteEditor; outside: HTMLInputElement };
  }>({
    focusFixture: async ({ setupEditor, onTestFinished }, use) => {
      const outside = document.createElement("input");
      // The parent of the mount element is the editor's focus boundary.
      const container = document.createElement("div");
      const mountPoint = document.createElement("div");
      container.append(mountPoint);
      document.body.append(container, outside);
      onTestFinished(() => {
        container.remove();
        outside.remove();
      });
      const { editor } = await setupEditor({
        mountType: false,
        initialContent: [{ type: "paragraph", content: "Selected text" }],
      });
      editor.mount(mountPoint);
      await use({ editor, outside });
    },
  });

  it("keeps the selection and the toolbar across a blur", async ({
    focusFixture: { editor, outside },
    selectText,
  }) => {
    const toolbar = editor.getExtension(FormattingToolbarExtension)!;
    editor.focus();
    selectText(editor, "Selected");
    expect(toolbar.store.state).toBe(true);

    outside.focus();
    await afterFocusoutCheck();
    expect(toolbar.store.state).toBe(false);

    editor.focus();
    expect(editor.getSelectedText()).toBe("Selected");
    expect(toolbar.store.state).toBe(true);
  });

  // Only touch devices drop the editor's focus when the window blurs; a
  // desktop keeps it, e.g. across a switch to another window and back.
  it("keeps focus, the selection and the toolbar when only the window blurs", async ({
    focusFixture: { editor },
    selectText,
  }) => {
    const toolbar = editor.getExtension(FormattingToolbarExtension)!;
    editor.focus();
    selectText(editor, "Selected");
    expect(toolbar.store.state).toBe(true);

    // WebKit's page blur: `blur` on the focused element, without focusout and
    // without moving `document.activeElement`, then on the window.
    editor.domElement!.dispatchEvent(new FocusEvent("blur"));
    window.dispatchEvent(new FocusEvent("blur"));
    await afterFocusoutCheck();

    expect(editor.isFocused()).toBe(true);
    expect(editor.getSelectedText()).toBe("Selected");
    expect(toolbar.store.state).toBe(true);
  });
});
