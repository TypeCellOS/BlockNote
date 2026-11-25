import { BlockNoteSchema } from "@blocknote/core";
import coreStyles from "@blocknote/core/style.css?inline";
import { flushSync } from "react-dom";
import { describe, expect } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import type { SetupEditor } from "../../../../tests/src/commands/browser/setupEditor.js";
import { useBrowserSuiteStyles } from "../../../../tests/src/commands/browser/useBrowserSuiteStyles.js";
import { createReactDiagramBlockSpec } from "./createReactDiagramBlockSpec.js";

useBrowserSuiteStyles(coreStyles);

const validSource = "graph TD\n  A[Start] --> B[End]";
const invalidSource = "not a diagram";

// The diagram block isn't a default block, so register it in a custom schema.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: { diagram: createReactDiagramBlockSpec() },
});

async function mountExample(setupEditor: SetupEditor, content = validSource) {
  const { editor, rootNode } = await setupEditor({
    skin: "raw",
    schema,
    trailingBlock: false,
    initialContent: [
      { id: "para", type: "paragraph", content: "before" },
      { id: "diagram", type: "diagram", content },
    ],
  });
  function popupState() {
    return rootNode
      .querySelector(".bn-preview-with-source-popup")
      ?.getAttribute("data-open");
  }

  function renderedDiagram() {
    return rootNode.querySelector('.bn-preview-container [role="img"] svg');
  }

  function errorState() {
    return rootNode.querySelector(
      ".bn-preview-container .bn-preview-placeholder-error",
    );
  }

  async function enterInvalidSource() {
    editor.updateBlock("diagram", { content: invalidSource });
    await expect
      .poll(() =>
        rootNode
          .querySelector(".bn-source-block-popup code")
          ?.getAttribute("aria-invalid"),
      )
      .toBe("true");
  }

  /** The diagram block's source as plain text. */
  function source(): string {
    const block = editor.getBlock("diagram");
    if (block?.type !== "diagram") {
      throw new Error("Expected a diagram block");
    }
    return block.content
      .map((node) => (node.type === "text" ? node.text : ""))
      .join("");
  }

  /** Dispatches a keydown on the editor DOM, running the ProseMirror keymap.
   * Returns whether the default was prevented. */
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

  await expect.poll(popupState).toBe("false");
  flushSync(() => editor.setTextCursorPosition("diagram", "start"));

  return {
    editor,
    rootNode,
    popupState,
    renderedDiagram,
    errorState,
    enterInvalidSource,
    source,
    pressKey,
  };
}

describe("Diagram block source popup", () => {
  it("renders the diagram preview as SVG", async ({ setupEditor }) => {
    const { renderedDiagram } = await mountExample(setupEditor);
    await expect.poll(() => renderedDiagram()?.textContent).toContain("Start");
  });

  it("Enter opens the source popup", async ({ setupEditor }) => {
    const { popupState, pressKey } = await mountExample(setupEditor);
    expect(popupState()).toBe("false");

    expect(pressKey("Enter")).toBe(true);
    await expect.poll(popupState).toBe("true");
  });

  it("Enter inserts a line break while the popup is open (newline enter behaviour)", async ({
    setupEditor,
  }) => {
    const { popupState, pressKey, source } = await mountExample(setupEditor);
    pressKey("Enter");
    await expect.poll(popupState).toBe("true");
    const sourceBefore = source();

    // Unlike the (single-line) math block, Enter extends the source instead
    // of closing the popup.
    expect(pressKey("Enter")).toBe(true);

    expect(popupState()).toBe("true");
    expect(source()).toBe(sourceBefore + "\n");
  });

  it("Mod+A selects only the source while the popup is open", async ({
    setupEditor,
    MOD,
  }) => {
    const { editor, popupState, pressKey, source } =
      await mountExample(setupEditor);
    editor.focus();
    pressKey("Enter");
    await expect.poll(popupState).toBe("true");

    expect(
      pressKey("a", { ctrlKey: MOD === "Control", metaKey: MOD === "Meta" }),
    ).toBe(true);

    const precedingBlock = editor.getBlock("para");
    await userEvent.keyboard("R");
    expect(source()).toBe("R");
    expect(editor.getBlock("para")).toEqual(precedingBlock);
    expect(popupState()).toBe("true");
  });

  it("Escape closes the source popup", async ({ setupEditor }) => {
    const { popupState, pressKey } = await mountExample(setupEditor);
    pressKey("Enter");
    await expect.poll(popupState).toBe("true");

    expect(pressKey("Escape")).toBe(true);
    await expect.poll(popupState).toBe("false");
  });

  it("blocks character input while the popup is closed", async ({
    setupEditor,
  }) => {
    const { popupState, pressKey } = await mountExample(setupEditor);
    expect(popupState()).toBe("false");

    // The source is hidden, so the keystroke is swallowed rather than
    // silently editing the source the user can't see.
    expect(pressKey("a")).toBe(true);
  });

  it("keeps the last preview while editing an erroneous source", async ({
    setupEditor,
  }) => {
    const {
      enterInvalidSource,
      errorState,
      popupState,
      pressKey,
      renderedDiagram,
    } = await mountExample(setupEditor);
    await expect.poll(renderedDiagram).not.toBeNull();
    pressKey("Enter");
    await expect.poll(popupState).toBe("true");

    await enterInvalidSource();

    // The last valid diagram stays up instead of the error state.
    expect(popupState()).toBe("true");
    expect(renderedDiagram()?.textContent).toContain("Start");
    expect(errorState()).toBeNull();
  });

  it("shows the error state once an erroneous source is committed", async ({
    setupEditor,
  }) => {
    const {
      enterInvalidSource,
      errorState,
      popupState,
      pressKey,
      renderedDiagram,
    } = await mountExample(setupEditor);
    await expect.poll(renderedDiagram).not.toBeNull();
    pressKey("Enter");
    await expect.poll(popupState).toBe("true");
    await enterInvalidSource();

    pressKey("Escape");
    await expect.poll(popupState).toBe("false");

    // Committed with an error, so the (stale) preview is replaced by the
    // error state.
    expect(renderedDiagram()).toBeNull();
    expect(errorState()).not.toBeNull();
  });

  it("keeps showing the error state when reopening a committed error", async ({
    setupEditor,
  }) => {
    const {
      enterInvalidSource,
      errorState,
      popupState,
      pressKey,
      renderedDiagram,
    } = await mountExample(setupEditor);
    await expect.poll(renderedDiagram).not.toBeNull();
    pressKey("Enter");
    await expect.poll(popupState).toBe("true");
    await enterInvalidSource();
    pressKey("Escape");
    await expect.poll(errorState).not.toBeNull();

    pressKey("Enter");
    await expect.poll(popupState).toBe("true");

    // The error was committed, so reopening doesn't bring the stale preview
    // back - the error state stays until the source renders successfully.
    expect(renderedDiagram()).toBeNull();
    expect(errorState()).not.toBeNull();
  });

  it("shows the error state while editing when there's no last preview", async ({
    setupEditor,
  }) => {
    const {
      enterInvalidSource,
      errorState,
      popupState,
      pressKey,
      renderedDiagram,
    } = await mountExample(setupEditor, "");
    pressKey("Enter");
    await expect.poll(popupState).toBe("true");
    await enterInvalidSource();

    expect(popupState()).toBe("true");
    expect(renderedDiagram()).toBeNull();
    expect(errorState()).not.toBeNull();
  });

  it("shows the placeholder for an empty source", async ({ setupEditor }) => {
    const { rootNode } = await mountExample(setupEditor, "");

    expect(
      rootNode.querySelector(".bn-preview-placeholder-text")?.textContent,
    ).toBe("Add a Mermaid diagram");
  });
});
