import "@blocknote/core/style.css";

import { BlockNoteSchema } from "@blocknote/core";
import { flushSync } from "react-dom";
import { describe, expect } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import type { SetupEditor } from "../../../../tests/src/commands/browser/setupEditor.js";
import { createReactMathBlockSpec } from "./createReactMathBlockSpec.js";

// The math block isn't a default block, so register it in a custom schema.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: { mathBlock: createReactMathBlockSpec() },
});

describe("Math block source popup keyboard handling", () => {
  let editor: typeof schema.BlockNoteEditor;
  let div: HTMLDivElement;

  async function setup(
    setupEditor: SetupEditor,
    blocks: (typeof schema.PartialBlock)[],
  ) {
    ({ editor, rootNode: div } = await setupEditor({
      skin: "raw",
      schema,
      initialContent: blocks,
      trailingBlock: false,
    }));
    await expectPopup(false);
  }

  /** The preview-with-source-popup root, which holds `data-open`. */
  function previewRoot() {
    return div.querySelector<HTMLElement>(
      '.bn-block[data-id="math"] .bn-preview-with-source-popup',
    );
  }

  async function expectPopup(open: boolean) {
    await expect
      .poll(() => previewRoot()?.getAttribute("data-open"))
      .toBe(String(open));
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
    editor.domElement!.dispatchEvent(event);
    return event.defaultPrevented;
  }

  describe("with adjacent paragraphs", () => {
    async function setupAdjacent(setupEditor: SetupEditor) {
      await setup(setupEditor, [
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "mathBlock", content: "a^2" },
        { id: "after", type: "paragraph", content: "after" },
      ]);
      editor.setTextCursorPosition("math", "start");
    }

    it("Enter opens the source popup, keeping the caret in the source", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      expect(pressKey("Enter")).toBe(true);
      await expectPopup(true);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });

    it("Enter again closes the source popup", async ({ setupEditor }) => {
      await setupAdjacent(setupEditor);
      pressKey("Enter");
      await expectPopup(true);

      expect(pressKey("Enter")).toBe(true);
      await expectPopup(false);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });

    it("Enter commits without inserting a line break", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      pressKey("Enter");
      await expectPopup(true);

      // Math keeps the default Enter (no `keyboard.enter: "line-break"`), so unlike the diagram
      // block, a plain Enter closes the popup rather than extending the source
      // with a newline (that needs Shift+Enter - see the next test).
      pressKey("Enter");
      await expectPopup(false);
      expect(editor.getBlock("math")!.content).toEqual([
        { type: "text", text: "a^2", styles: {} },
      ]);
    });

    it("Shift-Enter inserts a line break, keeping the popup open", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      pressKey("Enter");
      await expectPopup(true);

      // Shift+Enter extends the plain-text source with a literal newline
      // (not a `hardBreak` node, which "plain" content can't hold) instead of
      // committing, so multi-line LaTeX is possible.
      pressKey("Enter", { shiftKey: true });
      await expectPopup(true);
      expect(editor.getBlock("math")!.content).toEqual([
        { type: "text", text: "a^2\n", styles: {} },
      ]);
    });

    it("Escape closes the source popup while editing", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      pressKey("Enter");
      await expectPopup(true);

      expect(pressKey("Escape")).toBe(true);
      await expectPopup(false);
    });

    it("Escape leaves an already-closed popup closed", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      // Other keymaps may consume Escape; this popup must stay closed.
      flushSync(() => pressKey("Escape"));
      await expectPopup(false);
    });

    it("ArrowRight while the popup is hidden moves to the next block", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      expect(pressKey("ArrowRight")).toBe(true);

      expect(editor.getTextCursorPosition().block.id).toBe("after");
    });

    it("ArrowLeft while the popup is hidden moves to the previous block", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      expect(pressKey("ArrowLeft")).toBe(true);

      expect(editor.getTextCursorPosition().block.id).toBe("before");
    });

    it("ArrowRight with Ctrl/Cmd held defers to the default (no block jump)", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      // A modifier turns the arrow into a shortcut (e.g. word/line navigation),
      // so we don't hijack it to move between blocks.
      expect(pressKey("ArrowRight", { ctrlKey: true })).toBe(false);
      expect(editor.getTextCursorPosition().block.id).toBe("math");

      expect(pressKey("ArrowRight", { metaKey: true })).toBe(false);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });

    it("ArrowRight while editing defers to the default (navigates the source)", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      pressKey("Enter");
      await expectPopup(true);
      // A model block-start selection can land outside the source text in
      // Firefox. Arrange the native caret inside the source, not on the
      // boundary beside the non-editable preview.
      const source = previewRoot()?.querySelector("code");
      if (!source) {
        throw new Error("Math source did not render");
      }
      const document = source.ownerDocument;
      const text = document
        .createTreeWalker(source, NodeFilter.SHOW_TEXT)
        .nextNode();
      if (text?.textContent !== "a^2") {
        throw new Error("Expected the math source text");
      }
      editor.focus();
      await window.__blockNoteWaitForEditorFocus();
      editor.setTextCursorPosition("math", "start");
      const selection = document.getSelection()!;
      selection.collapse(text, 0);
      await expect
        .poll(
          () =>
            document.activeElement === editor.domElement &&
            selection.isCollapsed &&
            selection.anchorNode === text &&
            selection.anchorOffset === 0,
        )
        .toBe(true);

      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("!");

      await expectPopup(true);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
      expect(editor.getBlock("math")?.content).toEqual([
        { type: "text", text: "a!^2", styles: {} },
      ]);
    });

    it("blocks character input while the popup is closed", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      // The source is hidden, so the keystroke is swallowed (prevented) rather
      // than silently editing the source the user can't see.
      expect(pressKey("a")).toBe(true);
    });

    it("defers character input to the default while the popup is open", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      pressKey("Enter");
      await expectPopup(true);

      // The source is visible, so we don't swallow the key - ProseMirror gets to
      // handle it as normal text input.
      expect(pressKey("a")).toBe(false);
    });

    it("Backspace deletes the whole block while the popup is closed", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      // The source is hidden, so Backspace removes the whole block rather than
      // editing the source the user can't see.
      expect(pressKey("Backspace")).toBe(true);
      expect(editor.document.some((block) => block.id === "math")).toBe(false);
    });

    it("Delete deletes the whole block while the popup is closed", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      expect(pressKey("Delete")).toBe(true);
      expect(editor.document.some((block) => block.id === "math")).toBe(false);
    });

    it("blocks indent keys while the popup is closed", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      // Tab edits the hidden source, so it's swallowed.
      expect(pressKey("Tab")).toBe(true);
    });

    it("defers Ctrl/Cmd shortcuts to the default while the popup is closed", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      // Single-character keys are only blocked when no Ctrl/Cmd is held, so
      // shortcuts pass through - keeping copy/find working.
      // (Cut/paste also pass through; that's a known limitation.)
      expect(pressKey("c", { ctrlKey: true })).toBe(false);
      expect(pressKey("f", { ctrlKey: true })).toBe(false);
      expect(pressKey("v", { metaKey: true })).toBe(false);
      // Ctrl/Cmd-a is the exception: select-all is handled explicitly by
      // the global keymap (see KeyboardShortcutsExtension), not deferred to the
      // browser, so it reports as handled rather than passing through.
      expect(pressKey("a", { ctrlKey: true })).toBe(true);
    });

    it("defers deletion keys to the default while the popup is open", async ({
      setupEditor,
    }) => {
      await setupAdjacent(setupEditor);
      pressKey("Enter");
      await expectPopup(true);

      // The source is visible, so deletion is allowed through to ProseMirror.
      expect(pressKey("Backspace")).toBe(false);
    });
  });

  describe("at the document edges", () => {
    it("ArrowLeft with no previous block defers to the default", async ({
      setupEditor,
    }) => {
      await setup(setupEditor, [
        { id: "math", type: "mathBlock", content: "a^2" },
        { id: "after", type: "paragraph", content: "after" },
      ]);
      editor.setTextCursorPosition("math", "start");

      // No previous block to jump to, so the arrow isn't hijacked.
      pressKey("ArrowLeft");
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });

    it("ArrowRight with no next block defers to the default", async ({
      setupEditor,
    }) => {
      await setup(setupEditor, [
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "mathBlock", content: "a^2" },
      ]);
      editor.setTextCursorPosition("math", "start");

      // No next block to jump to, so the arrow isn't hijacked.
      pressKey("ArrowRight");
      expect(editor.getTextCursorPosition().block.id).toBe("math");
    });
  });

  describe("clicking the preview", () => {
    async function setupPreview(setupEditor: SetupEditor) {
      await setup(setupEditor, [
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "mathBlock", content: "a^2" },
      ]);
      editor.setTextCursorPosition("before", "start");
    }

    it("opens on the first click when selecting the math block rerenders its preview", async ({
      setupEditor,
    }) => {
      await setupPreview(setupEditor);
      const getFormula = () =>
        previewRoot()?.querySelector<HTMLElement>(
          ".bn-preview-container .katex",
        ) ?? null;
      await expect.poll(getFormula).not.toBeNull();
      const formula = getFormula();
      if (!formula) {
        throw new Error("Math preview did not render");
      }

      formula.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      );
      flushSync(() => editor.setTextCursorPosition("math", "start"));

      // A native click can be lost if selection rerenders the element that
      // received mousedown before the browser dispatches click.
      expect(getFormula()).toBe(formula);
      formula.dispatchEvent(
        new MouseEvent("mouseup", { bubbles: true, cancelable: true }),
      );
      formula.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await expectPopup(true);
    });

    it("opens the popup and places the cursor at the source end", async ({
      setupEditor,
    }) => {
      await setupPreview(setupEditor);
      const preview = previewRoot()?.querySelector<HTMLElement>(
        ".bn-preview-container",
      );
      if (!preview) {
        throw new Error("Math preview did not render");
      }

      await userEvent.click(preview);
      await expectPopup(true);
      expect(editor.getTextCursorPosition().block.id).toBe("math");
      editor.insertInlineContent("!");
      expect(editor.getBlock("math")?.content).toEqual([
        { type: "text", text: "a^2!", styles: {} },
      ]);
    });
  });

  describe("clicking the OK button", () => {
    it("closes the popup", async ({ setupEditor }) => {
      await setup(setupEditor, [
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "mathBlock", content: "a^2" },
      ]);
      editor.setTextCursorPosition("math", "start");
      // Open the popup so the OK button has something to close.
      pressKey("Enter");
      await expectPopup(true);

      const okButton = previewRoot()?.querySelector<HTMLElement>(
        ".bn-code-block-source-popup-ok-button",
      );
      if (!okButton) {
        throw new Error("Math popup OK button did not render");
      }

      await userEvent.click(okButton);
      await expectPopup(false);
    });
  });
});

describe("Math block export with invalid LaTeX", () => {
  function documentWith(source: string): (typeof schema.PartialBlock)[] {
    return [
      { type: "paragraph", content: "Before" },
      { type: "mathBlock", content: source },
      { type: "paragraph", content: "After" },
    ];
  }

  it.for([String.raw`\frac{1}{`, String.raw`\frac{<b>&amp;}{`])(
    "shows the source as text, and parses back to the same block: %s",
    async (source, { setupEditor }) => {
      const { editor } = await setupEditor({
        skin: "raw",
        schema,
        initialContent: documentWith(source),
      });

      const html = editor.blocksToHTMLLossy();

      const dom = new DOMParser().parseFromString(html, "text/html");
      const math = dom.querySelector("math");
      expect(dom.querySelectorAll("math")).toHaveLength(1);
      expect(math?.getAttribute("display")).toBe("block");
      expect(math?.querySelector("merror")?.textContent).toBe(source);
      expect(math?.querySelector("b")).toBeNull();
      expect(editor.tryParseHTMLToBlocks(html)).toMatchObject([
        { type: "paragraph", content: [{ text: "Before" }] },
        { type: "mathBlock", content: [{ text: source }] },
        { type: "paragraph", content: [{ text: "After" }] },
      ]);
    },
  );

  it("keeps the formula in the Markdown export", async ({ setupEditor }) => {
    const source = String.raw`\frac{1}{`;
    const { editor } = await setupEditor({
      skin: "raw",
      schema,
      initialContent: documentWith(source),
    });

    expect(editor.blocksToMarkdownLossy()).toBe(
      `Before\n\n$$\n${source}\n$$\n\nAfter\n`,
    );
  });
});
