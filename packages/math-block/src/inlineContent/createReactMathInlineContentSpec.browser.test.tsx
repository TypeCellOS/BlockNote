import "@blocknote/core/style.css";

import { BlockNoteSchema } from "@blocknote/core";
import { NodeSelection } from "prosemirror-state";
import { flushSync } from "react-dom";
import { describe, expect } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import type { SetupEditor } from "../../../../tests/src/commands/browser/setupEditor.js";
import type { NodeContext } from "../../../../tests/src/fixtures/editor.node.js";
import { createReactInlineMathSpec } from "./createReactMathInlineContentSpec.js";

// Inline math isn't default inline content, so register it in a custom schema.
const schema = BlockNoteSchema.create().extend({
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});

describe("Inline math preview first click", () => {
  it("keeps the formula mounted while the inline node is selected and opens its popup", async ({
    setupEditor,
  }) => {
    const { editor, rootNode: div } = await setupEditor({
      skin: "raw",
      schema,
      trailingBlock: false,
      initialContent: [
        {
          id: "para",
          type: "paragraph",
          content: ["before ", { type: "math", content: "a^2" }, " after"],
        },
      ],
    });
    const getFormula = () =>
      div.querySelector<HTMLElement>(".bn-preview-container .katex");
    await expect.poll(getFormula).not.toBeNull();
    const formula = getFormula();
    if (!formula) {
      throw new Error("Inline math preview did not render");
    }

    editor.setTextCursorPosition("para", "start");
    formula.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );

    // Commit selection-driven React work before checking node identity:
    // replacing the mousedown target here would prevent a native click.
    // Selecting an inline atom (rather than placing a text caret) is the
    // precondition for this regression and has no BlockNote selection command.
    flushSync(() =>
      editor.transact((tr) => {
        let mathPos: number | undefined;
        tr.doc.descendants((node, pos) => {
          if (node.type.name === "math") {
            mathPos = pos;
            return false;
          }
          return true;
        });
        if (mathPos === undefined) {
          throw new Error("Inline math node not found");
        }
        tr.setSelection(NodeSelection.create(tr.doc, mathPos));
      }),
    );
    expect(getFormula()).toBe(formula);
    formula.dispatchEvent(
      new MouseEvent("mouseup", { bubbles: true, cancelable: true }),
    );
    formula.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await expect.poll(() => popupState(div)).toBe("true");
  });
});

function popupState(root: HTMLElement) {
  return root
    .querySelector(".bn-preview-with-source-popup")
    ?.getAttribute("data-open");
}

describe("Inline math source popup", () => {
  let editor: typeof schema.BlockNoteEditor;
  let div: HTMLDivElement;

  async function mountExample(setupEditor: SetupEditor) {
    ({ editor, rootNode: div } = await setupEditor({
      skin: "raw",
      schema,
      trailingBlock: false,
      initialContent: [
        {
          id: "para",
          type: "paragraph",
          content: ["before ", { type: "math", content: "a^2" }, " after"],
        },
      ],
    }));
    // The React node view starts closed and renders its non-empty formula.
    await expectPopup(false);
    await expect.poll(() => previewRoot().querySelector("math")).not.toBeNull();
  }

  /** The preview-with-source-popup root, which holds `data-open`. */
  function previewRoot(): HTMLElement {
    return div.querySelector(".bn-preview-with-source-popup") as HTMLElement;
  }

  /** Waits for the DOM to reflect whether the selection is inside the source. */
  async function expectPopup(open: boolean) {
    await expect.poll(() => popupState(div)).toBe(String(open));
  }

  /** Moves the caret to the end of the inline math source (opening the popup). */
  function selectSource(selectText: NodeContext["selectText"]) {
    selectText(editor, "a^2").collapseToEnd();
  }

  /** Dispatches a keydown on the editor DOM, running the ProseMirror keymap. */
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

  function expectInsertion(before: string, math: string, after: string) {
    editor.insertInlineContent("!");
    expect(editor.getBlock("para")?.content).toMatchObject([
      { type: "text", text: before },
      { type: "math", content: math },
      { type: "text", text: after },
    ]);
  }

  it("renders a MathML preview for the inline math source", async ({
    setupEditor,
  }) => {
    await mountExample(setupEditor);
    // The source is non-empty, so the preview shows the rendered formula rather
    // than the "add source" placeholder button.
    expect(previewRoot()).not.toBeNull();
    expect(previewRoot().querySelector("math")).not.toBeNull();
  });

  it("keeps the popup closed while the cursor is outside the inline math", async ({
    setupEditor,
  }) => {
    await mountExample(setupEditor);
    editor.setTextCursorPosition("para", "start");

    await expectPopup(false);
  });

  it("opens the popup when the cursor moves into the source", async ({
    setupEditor,
    selectText,
  }) => {
    await mountExample(setupEditor);
    expect(popupState(div)).toBe("false");

    selectSource(selectText);
    await expectPopup(true);
    // The whole inline content is highlighted while its source is being edited.
    expect(previewRoot().classList.contains("ProseMirror-selectednode")).toBe(
      true,
    );
  });

  it("closes the popup when the cursor moves back out", async ({
    setupEditor,
    selectText,
  }) => {
    await mountExample(setupEditor);
    selectSource(selectText);
    await expectPopup(true);

    // Move the caret into the trailing paragraph text, outside the inline math.
    editor.setTextCursorPosition("para", "end");
    await expectPopup(false);
  });

  describe("committing the source", () => {
    async function openPopup(
      setupEditor: SetupEditor,
      selectText: NodeContext["selectText"],
    ) {
      await mountExample(setupEditor);
      selectSource(selectText);
      await expectPopup(true);
    }

    it("Enter moves the selection out of the source and closes the popup", async ({
      setupEditor,
      selectText,
    }) => {
      await openPopup(setupEditor, selectText);
      pressKey("Enter");
      await expectPopup(false);
      // The caret lands just after the inline math, back in the paragraph.
      expectInsertion("before ", "a^2", "! after");
    });

    it("Escape moves the selection out of the source and closes the popup", async ({
      setupEditor,
      selectText,
    }) => {
      await openPopup(setupEditor, selectText);
      pressKey("Escape");
      await expectPopup(false);
      expectInsertion("before ", "a^2", "! after");
    });

    it("ArrowUp moves the selection just before the inline content", async ({
      setupEditor,
      selectText,
    }) => {
      await openPopup(setupEditor, selectText);

      pressKey("ArrowUp");
      await expectPopup(false);
      expectInsertion("before !", "a^2", " after");
    });

    it("ArrowDown moves the selection just after the inline content", async ({
      setupEditor,
      selectText,
    }) => {
      await openPopup(setupEditor, selectText);

      pressKey("ArrowDown");
      await expectPopup(false);
      expectInsertion("before ", "a^2", "! after");
    });
  });

  describe("clicking the preview", () => {
    it("opens the popup and places the cursor at the source end", async ({
      setupEditor,
    }) => {
      await mountExample(setupEditor);
      editor.setTextCursorPosition("para", "start");

      const container = div.querySelector(
        ".bn-preview-container",
      ) as HTMLElement;

      await userEvent.click(container);
      await expectPopup(true);
      expectInsertion("before ", "a^2!", " after");
    });
  });

  describe("clicking the OK button", () => {
    it("closes the popup and moves the selection just after the inline content", async ({
      setupEditor,
      selectText,
    }) => {
      await mountExample(setupEditor);
      // Open the popup so the OK button has something to close.
      selectSource(selectText);
      await expectPopup(true);

      const okButton = div.querySelector(
        ".bn-code-block-source-popup-ok-button",
      ) as HTMLElement;

      await userEvent.click(okButton);
      await expectPopup(false);
      expectInsertion("before ", "a^2", "! after");
    });
  });
});
