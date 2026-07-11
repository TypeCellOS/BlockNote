import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { BlockNoteViewRaw } from "@blocknote/react";
import { flushSync } from "react-dom";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { createReactMathBlockSpec } from "./createReactMathBlockSpec.js";

/**
 * @vitest-environment jsdom
 */

// The math block isn't a default block, so register it in a custom schema.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: { math: createReactMathBlockSpec() },
});

describe("Math block source popup keyboard handling", () => {
  let editor: BlockNoteEditor<any, any, any>;
  let div: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    // jsdom doesn't implement `elementFromPoint`, which ProseMirror's mousedown
    // handler calls to map coordinates to a document position. The click tests
    // dispatch mouse events, so stub it out (returning `null` makes ProseMirror
    // bail gracefully) to avoid an uncaught error.
    if (!document.elementFromPoint) {
      document.elementFromPoint = () => null;
    }

    // The keyboard handler listens on the editor DOM (capture phase), so the
    // mount point must be in the document tree for dispatched keydowns to reach
    // it - a detached element's events never propagate to `document`.
    div = document.createElement("div");
    document.body.appendChild(div);

    editor = BlockNoteEditor.create({ schema });

    // Rendered the same way as the inline math test: a `BlockNoteViewRaw` into a
    // div, so the React node view mounts as it does in production. (The React
    // block renders via a `ReactNodeViewRenderer` portal, so `editor.mount`
    // isn't enough to get the preview into the DOM.)
    root = createRoot(div);
    flushSync(() => {
      root.render(<BlockNoteViewRaw editor={editor} />);
    });
  });

  afterEach(() => {
    root.unmount();
    editor._tiptapEditor.destroy();
    editor = undefined as any;
    div.remove();
  });

  /** Yields to the event loop so store-driven React re-renders can flush. */
  function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /** Replaces the document and waits for the React node views to render. */
  async function setup(blocks: any[]) {
    editor.replaceBlocks(editor.document, blocks);
    // The preview is rendered asynchronously by React, so wait for it before
    // reading its DOM.
    await flush();
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

  /** Dispatches a keydown as if the caret were in the block's (possibly
   * hidden) source. Returns whether the default was prevented.
   *
   * Dispatched on the ProseMirror DOM rather than the preview element:
   * ProseMirror ignores keydowns originating from the `contentEditable=false`
   * preview region, so its keymap (Enter/Escape/arrows) wouldn't fire there.
   * The handlers key off the selection (set via `setTextCursorPosition`), not
   * the event target, so this matches a real caret in the source. */
  function pressKey(key: string, init: KeyboardEventInit = {}): boolean {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    editor.prosemirrorView!.dom.dispatchEvent(event);
    return event.defaultPrevented;
  }

  describe("with adjacent paragraphs", () => {
    beforeEach(async () => {
      await setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "math", content: "a^2" },
        { id: "after", type: "paragraph", content: "after" },
      ]);
      editor.setTextCursorPosition("math", "start");
    });

    it("Enter opens the source popup, keeping the caret in the source", async () => {
      expect(isPopupOpen("math")).toBe(false);

      expect(pressKey("Enter")).toBe(true);
      await flush();

      expect(isPopupOpen("math")).toBe(true);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });

    it("Enter again closes the source popup", async () => {
      pressKey("Enter");
      await flush();
      expect(isPopupOpen("math")).toBe(true);

      expect(pressKey("Enter")).toBe(true);
      await flush();

      expect(isPopupOpen("math")).toBe(false);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });

    it("Enter commits without inserting a line break (single-line source)", async () => {
      pressKey("Enter");
      await flush();
      expect(isPopupOpen("math")).toBe(true);

      // The math source is single-line (no `hardBreakShortcut: "enter"`), so
      // unlike the diagram block, Enter closes the popup rather than extending
      // the source with a newline.
      pressKey("Enter");
      await flush();

      expect(isPopupOpen("math")).toBe(false);
      expect(editor.getBlock("math")!.content).toEqual([
        { type: "text", text: "a^2", styles: {} },
      ]);
    });

    it("Escape closes the source popup while editing", async () => {
      pressKey("Enter");
      await flush();
      expect(isPopupOpen("math")).toBe(true);

      expect(pressKey("Escape")).toBe(true);
      await flush();

      expect(isPopupOpen("math")).toBe(false);
    });

    it("Escape leaves an already-closed popup closed", async () => {
      expect(isPopupOpen("math")).toBe(false);

      // Defers to the default; our handler doesn't touch the popup state.
      pressKey("Escape");
      await flush();

      expect(isPopupOpen("math")).toBe(false);
    });

    it("ArrowRight while the popup is hidden moves to the next block", () => {
      expect(pressKey("ArrowRight")).toBe(true);

      expect(editor.getTextCursorPosition().block.id).toBe("after");
    });

    it("ArrowLeft while the popup is hidden moves to the previous block", () => {
      expect(pressKey("ArrowLeft")).toBe(true);

      expect(editor.getTextCursorPosition().block.id).toBe("before");
    });

    it("ArrowRight with Ctrl/Cmd held defers to the default (no block jump)", () => {
      // A modifier turns the arrow into a shortcut (e.g. word/line navigation),
      // so we don't hijack it to move between blocks.
      expect(pressKey("ArrowRight", { ctrlKey: true })).toBe(false);
      expect(editor.getTextCursorPosition().block.id).toBe("math");

      expect(pressKey("ArrowRight", { metaKey: true })).toBe(false);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });

    it("ArrowRight while editing defers to the default (navigates the source)", async () => {
      pressKey("Enter");
      await flush();
      expect(isPopupOpen("math")).toBe(true);

      // The arrow isn't hijacked: we stay in the math block with the popup open.
      pressKey("ArrowRight");
      await flush();

      expect(editor.getTextCursorPosition().block.id).toBe("math");
      expect(isPopupOpen("math")).toBe(true);
    });

    it("blocks character input while the popup is closed", () => {
      expect(isPopupOpen("math")).toBe(false);

      // The source is hidden, so the keystroke is swallowed (prevented) rather
      // than silently editing the source the user can't see.
      expect(pressKey("a")).toBe(true);
    });

    it("defers character input to the default while the popup is open", async () => {
      pressKey("Enter");
      await flush();
      expect(isPopupOpen("math")).toBe(true);

      // The source is visible, so we don't swallow the key - ProseMirror gets to
      // handle it as normal text input.
      expect(pressKey("a")).toBe(false);
    });

    it("Backspace deletes the whole block while the popup is closed", () => {
      expect(isPopupOpen("math")).toBe(false);

      // The source is hidden, so Backspace removes the whole block rather than
      // editing the source the user can't see.
      expect(pressKey("Backspace")).toBe(true);
      expect(editor.document.some((block) => block.id === "math")).toBe(false);
    });

    it("Delete deletes the whole block while the popup is closed", () => {
      expect(isPopupOpen("math")).toBe(false);

      expect(pressKey("Delete")).toBe(true);
      expect(editor.document.some((block) => block.id === "math")).toBe(false);
    });

    it("blocks indent keys while the popup is closed", () => {
      expect(isPopupOpen("math")).toBe(false);

      // Tab edits the hidden source, so it's swallowed.
      expect(pressKey("Tab")).toBe(true);
    });

    it("defers Ctrl/Cmd shortcuts to the default while the popup is closed", () => {
      expect(isPopupOpen("math")).toBe(false);

      // Single-character keys are only blocked when no Ctrl/Cmd is held, so
      // shortcuts pass through - keeping copy/select-all/find working.
      // (Cut/paste also pass through; that's a known limitation.)
      expect(pressKey("c", { ctrlKey: true })).toBe(false);
      expect(pressKey("a", { ctrlKey: true })).toBe(false);
      expect(pressKey("f", { ctrlKey: true })).toBe(false);
      expect(pressKey("v", { metaKey: true })).toBe(false);
    });

    it("defers deletion keys to the default while the popup is open", async () => {
      pressKey("Enter");
      await flush();
      expect(isPopupOpen("math")).toBe(true);

      // The source is visible, so deletion is allowed through to ProseMirror.
      expect(pressKey("Backspace")).toBe(false);
    });
  });

  describe("at the document edges", () => {
    it("ArrowLeft with no previous block defers to the default", async () => {
      await setup([
        { id: "math", type: "math", content: "a^2" },
        { id: "after", type: "paragraph", content: "after" },
      ]);
      editor.setTextCursorPosition("math", "start");

      // No previous block to jump to, so the arrow isn't hijacked.
      pressKey("ArrowLeft");
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });

    it("ArrowRight with no next block defers to the default", async () => {
      await setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "math", content: "a^2" },
      ]);
      editor.setTextCursorPosition("math", "start");

      // No next block to jump to, so the arrow isn't hijacked.
      pressKey("ArrowRight");
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });
  });

  describe("clicking the preview", () => {
    beforeEach(async () => {
      await setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "math", content: "a^2" },
      ]);
      editor.setTextCursorPosition("before", "start");
    });

    it("opens the popup and places the cursor at the source end", async () => {
      const preview = div.querySelector(
        `.bn-block[data-id="math"] .bn-preview-container`,
      ) as HTMLElement;

      // The popup opens on the click; the mousedown is dispatched too for a
      // realistic event sequence.
      preview.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      );
      preview.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await flush();

      expect(isPopupOpen("math")).toBe(true);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
      // The cursor lands at the end of the source (after "a^2").
      expect(editor.prosemirrorView!.state.selection.$from.parentOffset).toBe(
        3,
      );
    });
  });

  describe("clicking the OK button", () => {
    beforeEach(async () => {
      await setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "math", content: "a^2" },
      ]);
      editor.setTextCursorPosition("math", "start");
      // Open the popup so the OK button has something to close.
      pressKey("Enter");
      await flush();
      expect(isPopupOpen("math")).toBe(true);
    });

    it("closes the popup", async () => {
      const okButton = div.querySelector(
        `.bn-block[data-id="math"] .bn-code-block-source-popup-ok-button`,
      ) as HTMLElement;

      okButton.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      );
      okButton.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await flush();

      expect(isPopupOpen("math")).toBe(false);
    });
  });
});
