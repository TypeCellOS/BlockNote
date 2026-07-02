import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { createMathBlockSpec } from "./createMathBlockSpec.js";

/**
 * @vitest-environment jsdom
 */

// The math block isn't a default block, so register it in a custom schema.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: { math: createMathBlockSpec() },
});

describe("Math block source popup keyboard handling", () => {
  let editor: BlockNoteEditor<any, any, any>;
  const div = document.createElement("div");

  beforeEach(() => {
    // The keyboard handler listens on the document (capture phase), so the
    // mount point must be in the document tree for dispatched keydowns to reach
    // it - a detached element's events never propagate to `document`.
    document.body.appendChild(div);
    editor = BlockNoteEditor.create({ schema });
    editor.mount(div);
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;
    div.remove();
  });

  function setup(blocks: any[]) {
    editor.replaceBlocks(editor.document, blocks);
  }

  /** The preview-with-source-popup root, which holds `data-open`. */
  function previewRoot(blockId: string): HTMLElement {
    return div.querySelector(
      `.bn-block[data-id="${blockId}"] .bn-preview-with-source-popup`,
    ) as HTMLElement;
  }

  /** Whether the source popup is open (the preview is being edited). */
  function isPopupOpen(blockId: string): boolean {
    return previewRoot(blockId)?.getAttribute("data-open") === "true";
  }

  /** Dispatches a keydown on the block's preview, as if the caret were in its
   * (possibly hidden) source. Returns whether the default was prevented. */
  function pressKey(
    blockId: string,
    key: string,
    init: KeyboardEventInit = {},
  ): boolean {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    previewRoot(blockId).dispatchEvent(event);
    return event.defaultPrevented;
  }

  describe("with adjacent paragraphs", () => {
    beforeEach(() => {
      setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "math", content: "a^2" },
        { id: "after", type: "paragraph", content: "after" },
      ]);
      editor.setTextCursorPosition("math", "start");
    });

    it("Enter opens the source popup, keeping the caret in the source", () => {
      expect(isPopupOpen("math")).toBe(false);

      expect(pressKey("math", "Enter")).toBe(true);

      expect(isPopupOpen("math")).toBe(true);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });

    it("Enter again closes the source popup", () => {
      pressKey("math", "Enter");
      expect(isPopupOpen("math")).toBe(true);

      expect(pressKey("math", "Enter")).toBe(true);

      expect(isPopupOpen("math")).toBe(false);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });

    it("Escape closes the source popup while editing", () => {
      pressKey("math", "Enter");
      expect(isPopupOpen("math")).toBe(true);

      expect(pressKey("math", "Escape")).toBe(true);

      expect(isPopupOpen("math")).toBe(false);
    });

    it("Escape leaves an already-closed popup closed", () => {
      expect(isPopupOpen("math")).toBe(false);

      // Defers to the default; our handler doesn't touch the popup state.
      pressKey("math", "Escape");

      expect(isPopupOpen("math")).toBe(false);
    });

    it("ArrowRight while the popup is hidden moves to the next block", () => {
      expect(pressKey("math", "ArrowRight")).toBe(true);

      expect(editor.getTextCursorPosition().block.id).toBe("after");
    });

    it("ArrowLeft while the popup is hidden moves to the previous block", () => {
      expect(pressKey("math", "ArrowLeft")).toBe(true);

      expect(editor.getTextCursorPosition().block.id).toBe("before");
    });

    it("ArrowRight with Ctrl/Cmd held defers to the default (no block jump)", () => {
      // A modifier turns the arrow into a shortcut (e.g. word/line navigation),
      // so we don't hijack it to move between blocks.
      expect(pressKey("math", "ArrowRight", { ctrlKey: true })).toBe(false);
      expect(editor.getTextCursorPosition().block.id).toBe("math");

      expect(pressKey("math", "ArrowRight", { metaKey: true })).toBe(false);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });

    it("ArrowRight while editing defers to the default (navigates the source)", () => {
      pressKey("math", "Enter");
      expect(isPopupOpen("math")).toBe(true);

      // The arrow isn't hijacked: we stay in the math block with the popup open.
      pressKey("math", "ArrowRight");

      expect(editor.getTextCursorPosition().block.id).toBe("math");
      expect(isPopupOpen("math")).toBe(true);
    });

    it("blocks character input while the popup is closed", () => {
      expect(isPopupOpen("math")).toBe(false);

      // The source is hidden, so the keystroke is swallowed (prevented) rather
      // than silently editing the source the user can't see.
      expect(pressKey("math", "a")).toBe(true);
    });

    it("defers character input to the default while the popup is open", () => {
      pressKey("math", "Enter");
      expect(isPopupOpen("math")).toBe(true);

      // The source is visible, so we don't swallow the key - ProseMirror gets to
      // handle it as normal text input.
      expect(pressKey("math", "a")).toBe(false);
    });

    it("Backspace deletes the whole block while the popup is closed", () => {
      expect(isPopupOpen("math")).toBe(false);

      // The source is hidden, so Backspace removes the whole block rather than
      // editing the source the user can't see.
      expect(pressKey("math", "Backspace")).toBe(true);
      expect(editor.document.some((block) => block.id === "math")).toBe(false);
    });

    it("Delete deletes the whole block while the popup is closed", () => {
      expect(isPopupOpen("math")).toBe(false);

      expect(pressKey("math", "Delete")).toBe(true);
      expect(editor.document.some((block) => block.id === "math")).toBe(false);
    });

    it("blocks indent keys while the popup is closed", () => {
      expect(isPopupOpen("math")).toBe(false);

      // Tab edits the hidden source, so it's swallowed.
      expect(pressKey("math", "Tab")).toBe(true);
    });

    it("defers Ctrl/Cmd shortcuts to the default while the popup is closed", () => {
      expect(isPopupOpen("math")).toBe(false);

      // Single-character keys are only blocked when no Ctrl/Cmd is held, so
      // shortcuts pass through - keeping copy/select-all/find working.
      // (Cut/paste also pass through; that's a known limitation.)
      expect(pressKey("math", "c", { ctrlKey: true })).toBe(false);
      expect(pressKey("math", "a", { ctrlKey: true })).toBe(false);
      expect(pressKey("math", "f", { ctrlKey: true })).toBe(false);
      expect(pressKey("math", "v", { metaKey: true })).toBe(false);
    });

    it("defers deletion keys to the default while the popup is open", () => {
      pressKey("math", "Enter");
      expect(isPopupOpen("math")).toBe(true);

      // The source is visible, so deletion is allowed through to ProseMirror.
      expect(pressKey("math", "Backspace")).toBe(false);
    });
  });

  describe("at the document edges", () => {
    it("ArrowLeft with no previous block defers to the default", () => {
      setup([
        { id: "math", type: "math", content: "a^2" },
        { id: "after", type: "paragraph", content: "after" },
      ]);
      editor.setTextCursorPosition("math", "start");

      // No previous block to jump to, so the arrow isn't hijacked.
      pressKey("math", "ArrowLeft");
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });

    it("ArrowRight with no next block defers to the default", () => {
      setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "math", content: "a^2" },
      ]);
      editor.setTextCursorPosition("math", "start");

      // No next block to jump to, so the arrow isn't hijacked.
      pressKey("math", "ArrowRight");
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });
  });

  describe("clicking the preview", () => {
    beforeEach(() => {
      setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "math", content: "a^2" },
      ]);
      editor.setTextCursorPosition("before", "start");
    });

    it("opens the popup and places the cursor at the source end", () => {
      const preview = div.querySelector(
        `.bn-block[data-id="math"] .bn-preview-container`,
      ) as HTMLElement;

      preview.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      );

      expect(isPopupOpen("math")).toBe(true);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
      // The cursor lands at the end of the source (after "a^2").
      expect(editor.prosemirrorView.state.selection.$from.parentOffset).toBe(3);
    });
  });
});
