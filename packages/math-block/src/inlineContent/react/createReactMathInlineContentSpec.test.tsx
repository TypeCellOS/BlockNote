import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { BlockNoteViewRaw } from "@blocknote/react";
import { Node } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { flushSync } from "react-dom";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { createReactInlineMathSpec } from "./createReactMathInlineContentSpec.js";

// TODO: migrate to react, and depreacte jsdom (use vitest browser test?)
/**
 * @vitest-environment jsdom
 */

// Inline math isn't default inline content, so register it in a custom schema.
const schema = BlockNoteSchema.create().extend({
  inlineContentSpecs: { inlineMath: createReactInlineMathSpec() },
});

describe.skip("Inline math source popup", () => {
  let editor: BlockNoteEditor<any, any, any>;
  let div: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    // Rendered the same way as `setupTestEditor`: a `BlockNoteViewRaw` into a
    // detached div, so the React node view mounts as it does in production.
    div = document.createElement("div");

    editor = BlockNoteEditor.create({
      schema,
      trailingBlock: false,
      initialContent: [
        {
          id: "para",
          type: "paragraph",
          content: [
            "before ",
            { type: "inlineMath", content: "a^2" },
            " after",
          ],
        },
      ],
    });

    root = createRoot(div);
    flushSync(() => {
      root.render(<BlockNoteViewRaw editor={editor} />);
    });
    // Let the React node view render before assertions read its DOM.
    await flush();
  });

  afterEach(() => {
    root.unmount();
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  /** Yields to the event loop so store-driven React re-renders can flush. */
  function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /** The inline math node and its position in the document. */
  function inlineMath(): { node: Node; pos: number } {
    let result: { node: Node; pos: number } | undefined;
    editor.prosemirrorState.doc.descendants((node, pos) => {
      if (node.type.name === "inlineMath") {
        result = { node, pos };
        return false;
      }
      return true;
    });
    return result!;
  }

  /** The preview-with-source-popup root, which holds `data-open`. */
  function previewRoot(): HTMLElement {
    return div.querySelector(".bn-preview-with-source-popup") as HTMLElement;
  }

  /**
   * Whether the source popup is open. Unlike the block, there's no toggle flag:
   * the popup is open exactly when the selection sits inside the inline math.
   */
  function isPopupOpen(): boolean {
    return previewRoot()?.getAttribute("data-open") === "true";
  }

  /** Places the selection at the given document position. */
  function setSelection(pos: number) {
    const view = editor.prosemirrorView!;
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)),
    );
  }

  /** Moves the caret to the end of the inline math source (opening the popup). */
  function selectSource() {
    const { node, pos } = inlineMath();
    setSelection(pos + node.nodeSize - 1);
  }

  /** Dispatches a keydown on the editor DOM, running the ProseMirror keymap. */
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

  /** The name of the node the selection currently sits in. */
  function selectedNodeType(): string {
    return editor.prosemirrorState.selection.$from.node().type.name;
  }

  it("renders a MathML preview for the inline math source", () => {
    // The source is non-empty, so the preview shows the rendered formula rather
    // than the "add source" placeholder button.
    expect(previewRoot()).not.toBeNull();
    expect(previewRoot().querySelector("math")).not.toBeNull();
  });

  it("keeps the popup closed while the cursor is outside the inline math", () => {
    editor.setTextCursorPosition("para", "start");

    expect(isPopupOpen()).toBe(false);
  });

  it("opens the popup when the cursor moves into the source", async () => {
    expect(isPopupOpen()).toBe(false);

    selectSource();
    await flush();

    expect(isPopupOpen()).toBe(true);
    // The whole inline content is highlighted while its source is being edited.
    expect(previewRoot().classList.contains("ProseMirror-selectednode")).toBe(
      true,
    );
  });

  it("closes the popup when the cursor moves back out", async () => {
    selectSource();
    await flush();
    expect(isPopupOpen()).toBe(true);

    // Move the caret into the trailing paragraph text, outside the inline math.
    editor.setTextCursorPosition("para", "end");
    await flush();

    expect(isPopupOpen()).toBe(false);
  });

  describe("committing the source", () => {
    beforeEach(async () => {
      selectSource();
      await flush();
      expect(isPopupOpen()).toBe(true);
    });

    it("Enter moves the selection out of the source and closes the popup", async () => {
      pressKey("Enter");
      await flush();

      expect(isPopupOpen()).toBe(false);
      // The caret lands just after the inline math, back in the paragraph.
      expect(selectedNodeType()).not.toBe("inlineMath");
    });

    it("Escape moves the selection out of the source and closes the popup", async () => {
      pressKey("Escape");
      await flush();

      expect(isPopupOpen()).toBe(false);
      expect(selectedNodeType()).not.toBe("inlineMath");
    });

    it("ArrowUp moves the selection just before the inline content", async () => {
      const { pos } = inlineMath();

      pressKey("ArrowUp");
      await flush();

      expect(isPopupOpen()).toBe(false);
      expect(selectedNodeType()).not.toBe("inlineMath");
      // The caret lands just before the inline math (at its start position).
      expect(editor.prosemirrorState.selection.from).toBe(pos);
    });

    it("ArrowDown moves the selection just after the inline content", async () => {
      const { node, pos } = inlineMath();

      pressKey("ArrowDown");
      await flush();

      expect(isPopupOpen()).toBe(false);
      expect(selectedNodeType()).not.toBe("inlineMath");
      // The caret lands just after the inline math.
      expect(editor.prosemirrorState.selection.from).toBe(pos + node.nodeSize);
    });
  });

  describe("clicking the preview", () => {
    beforeEach(() => {
      editor.setTextCursorPosition("para", "start");
    });

    it("opens the popup and places the cursor at the source end", async () => {
      const container = div.querySelector(
        ".bn-preview-container",
      ) as HTMLElement;

      // The popup opens on the click; the mousedown is dispatched too for a
      // realistic event sequence.
      container.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      );
      container.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await flush();

      expect(isPopupOpen()).toBe(true);
      expect(selectedNodeType()).toBe("inlineMath");
      // The cursor lands at the end of the source (after "a^2").
      expect(editor.prosemirrorState.selection.$from.parentOffset).toBe(3);
    });
  });

  describe("clicking the OK button", () => {
    beforeEach(async () => {
      // Open the popup so the OK button has something to close.
      selectSource();
      await flush();
      expect(isPopupOpen()).toBe(true);
    });

    it("closes the popup and moves the selection just after the inline content", async () => {
      const { node, pos } = inlineMath();

      const okButton = div.querySelector(
        ".bn-code-block-source-popup-ok-button",
      ) as HTMLElement;

      okButton.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      );
      okButton.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await flush();

      expect(isPopupOpen()).toBe(false);
      expect(selectedNodeType()).not.toBe("inlineMath");
      // The caret lands just after the inline math.
      expect(editor.prosemirrorState.selection.from).toBe(pos + node.nodeSize);
    });
  });
});
