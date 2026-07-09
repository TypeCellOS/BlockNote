import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { BlockNoteViewRaw } from "@blocknote/react";
import { flushSync } from "react-dom";
import { createRoot, Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { createReactDiagramBlockSpec } from "./createReactDiagramBlockSpec.js";

// TODO: deprecate jsdom, use vitest browser test?
/**
 * @vitest-environment jsdom
 */

// Mermaid needs a real browser to render, so the tests mock it - the specs
// under test cover the block's editing behavior, not Mermaid itself. Sources
// containing "INVALID" fail to parse, for testing the error states.
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    parse: vi.fn(async (source: string) => {
      if (source.includes("INVALID")) {
        throw new Error("mock parse error");
      }
      return true;
    }),
    render: vi.fn(async () => ({
      svg: '<svg data-mermaid-mock="true"></svg>',
    })),
  },
}));

// The diagram block isn't a default block, so register it in a custom schema.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: { diagram: createReactDiagramBlockSpec() },
});

describe("Diagram block source popup", () => {
  let editor: BlockNoteEditor<any, any, any>;
  let div: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    // Mounted in the document tree so capture-phase handlers on ancestors see
    // dispatched events.
    div = document.createElement("div");
    document.body.appendChild(div);

    editor = BlockNoteEditor.create({
      schema,
      trailingBlock: false,
      initialContent: [
        { id: "para", type: "paragraph", content: "before" },
        { id: "diagram", type: "diagram", content: "graph TD\n  A --> B" },
      ],
    });

    root = createRoot(div);
    flushSync(() => {
      root.render(<BlockNoteViewRaw editor={editor} />);
    });
    // Let the React node view render (and the mocked Mermaid "render") before
    // assertions read its DOM.
    await flush();

    editor.setTextCursorPosition("diagram", "start");
  });

  afterEach(() => {
    root.unmount();
    editor._tiptapEditor.destroy();
    editor = undefined as any;
    div.remove();
  });

  /** Yields to the event loop so async renders & store updates can flush. */
  function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /** The preview-with-source-popup root, which holds `data-open`. */
  function previewRoot(): HTMLElement {
    return div.querySelector(".bn-preview-with-source-popup") as HTMLElement;
  }

  /** Whether the source popup is open (the source is being edited). */
  function isPopupOpen(): boolean {
    return previewRoot()?.getAttribute("data-open") === "true";
  }

  /** The diagram block's source as plain text. */
  function source(): string {
    const block = editor.getBlock("diagram")!;
    return (block.content as { text: string }[])
      .map((node) => node.text ?? "")
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
    editor.prosemirrorView!.dom.dispatchEvent(event);
    return event.defaultPrevented;
  }

  it("renders the (mocked) diagram preview", () => {
    expect(
      previewRoot().querySelector(
        '.bn-preview-container [data-mermaid-mock="true"]',
      ),
    ).not.toBeNull();
  });

  it("Enter opens the source popup", async () => {
    expect(isPopupOpen()).toBe(false);

    expect(pressKey("Enter")).toBe(true);
    await flush();

    expect(isPopupOpen()).toBe(true);
  });

  it("Enter inserts a line break while the popup is open (newline enter behaviour)", async () => {
    pressKey("Enter");
    await flush();
    expect(isPopupOpen()).toBe(true);
    const sourceBefore = source();

    // Unlike the (single-line) math block, Enter extends the source instead
    // of closing the popup.
    expect(pressKey("Enter")).toBe(true);
    await flush();

    expect(isPopupOpen()).toBe(true);
    expect(source()).toBe(sourceBefore + "\n");
  });

  it("Mod+A selects only the source while the popup is open", async () => {
    pressKey("Enter");
    await flush();
    expect(isPopupOpen()).toBe(true);

    // jsdom isn't detected as macOS, so "Mod" resolves to Ctrl.
    expect(pressKey("a", { ctrlKey: true })).toBe(true);
    await flush();

    // The selection spans exactly the block's source, not the document.
    const selection = editor.prosemirrorState.selection;
    expect(
      editor.prosemirrorState.doc.textBetween(selection.from, selection.to),
    ).toBe(source());
    expect(isPopupOpen()).toBe(true);
  });

  it("Escape closes the source popup", async () => {
    pressKey("Enter");
    await flush();
    expect(isPopupOpen()).toBe(true);

    expect(pressKey("Escape")).toBe(true);
    await flush();

    expect(isPopupOpen()).toBe(false);
  });

  it("blocks character input while the popup is closed", () => {
    expect(isPopupOpen()).toBe(false);

    // The source is hidden, so the keystroke is swallowed rather than
    // silently editing the source the user can't see.
    expect(pressKey("a")).toBe(true);
  });

  /** The mocked rendered diagram, if currently shown as the preview. */
  function renderedDiagram(): Element | null {
    return previewRoot().querySelector(
      '.bn-preview-container [data-mermaid-mock="true"]',
    );
  }

  /** The compact error state, if currently shown as the preview. */
  function errorState(): Element | null {
    return previewRoot().querySelector(
      ".bn-preview-container .bn-preview-placeholder-error",
    );
  }

  it("keeps the last preview while editing an erroneous source", async () => {
    pressKey("Enter");
    await flush();
    expect(isPopupOpen()).toBe(true);

    editor.updateBlock("diagram", { content: "graph INVALID" });
    await flush();

    // The last valid diagram stays up instead of the error state.
    expect(renderedDiagram()).not.toBeNull();
    expect(errorState()).toBeNull();
  });

  it("shows the error state once an erroneous source is committed", async () => {
    pressKey("Enter");
    await flush();
    editor.updateBlock("diagram", { content: "graph INVALID" });
    await flush();

    pressKey("Escape");
    await flush();
    expect(isPopupOpen()).toBe(false);

    // Committed with an error, so the (stale) preview is replaced by the
    // error state.
    expect(renderedDiagram()).toBeNull();
    expect(errorState()).not.toBeNull();
  });

  it("keeps showing the error state when reopening a committed error", async () => {
    pressKey("Enter");
    await flush();
    editor.updateBlock("diagram", { content: "graph INVALID" });
    await flush();
    pressKey("Escape");
    await flush();
    expect(errorState()).not.toBeNull();

    pressKey("Enter");
    await flush();
    expect(isPopupOpen()).toBe(true);

    // The error was committed, so reopening doesn't bring the stale preview
    // back - the error state stays until the source renders successfully.
    expect(renderedDiagram()).toBeNull();
    expect(errorState()).not.toBeNull();
  });

  it("shows the error state while editing when there's no last preview", async () => {
    // A fresh block whose source never rendered successfully.
    editor.removeBlocks(["diagram"]);
    editor.insertBlocks(
      [{ id: "broken", type: "diagram", content: "graph INVALID" }],
      "para",
      "after",
    );
    await flush();

    expect(renderedDiagram()).toBeNull();
    expect(errorState()).not.toBeNull();
  });

  it("shows the placeholder for an empty source", async () => {
    editor.removeBlocks(["diagram"]);
    editor.insertBlocks(
      [{ id: "empty", type: "diagram", content: "" }],
      "para",
      "after",
    );
    await flush();

    expect(
      previewRoot().querySelector(".bn-preview-placeholder-text")?.textContent,
    ).toBe("Add a Mermaid diagram");
  });
});
