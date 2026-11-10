import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import "../../editor/editor.css";

const cleanup: (() => void)[] = [];

afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose());
});

describe("focus after a drop from another root", () => {
  it("finishes a drop in a shadow root without a local dragend", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    cleanup.push(() => host.remove());
    const root = host.attachShadow({ mode: "open" });
    const container = document.createElement("div");
    root.appendChild(container);
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "paragraph", content: "Target" }],
    });
    editor.mount(container);
    cleanup.push(() => editor._tiptapEditor.destroy());

    const view = editor.prosemirrorView;
    const rect = view.dom.getBoundingClientRect();
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/html", "<p>Incoming</p>");
    dataTransfer.setData("blocknote/html", "<p>Incoming</p>");
    // A drag from a different document/root delivers drop here, but its
    // dragend fires at the source and never reaches this root.
    view.dom.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 5,
        clientY: rect.top + rect.height / 2,
        dataTransfer,
      }),
    );

    expect(view.state.doc.textContent).toContain("Incoming");
    await expect.poll(() => view.state.selection.empty).toBe(true);
    expect(root.activeElement).toBe(view.dom);
  });
});
