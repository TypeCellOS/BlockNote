import { describe, expect } from "vite-plus/test";

import { installBrowserNoMotion } from "../../../../../tests/src/commands/browser/installBrowserTestStyles.js";
import "../../editor/editor.css";

describe("focus after a drop from another root", () => {
  it("finishes a drop in a shadow root without a local dragend", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    onTestFinished(() => host.remove());
    const root = host.attachShadow({ mode: "open" });
    onTestFinished(installBrowserNoMotion(root));
    const container = document.createElement("div");
    root.appendChild(container);
    const { editor } = await setupEditor({
      mountType: false,
      initialContent: [{ type: "paragraph", content: "Target" }],
    });
    editor.mount(container);
    const editable = editor.domElement!;
    const rect = editable.getBoundingClientRect();
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/html", "<p>Incoming</p>");
    dataTransfer.setData("blocknote/html", "<p>Incoming</p>");
    // A drag from a different document/root delivers drop here, but its
    // dragend fires at the source and never reaches this root.
    editable.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 5,
        clientY: rect.top + rect.height / 2,
        dataTransfer,
      }),
    );

    expect(editable.textContent).toContain("Incoming");
    await expect
      .poll(() => editor.transact((tr) => tr.selection.empty))
      .toBe(true);
    expect(root.activeElement).toBe(editable);
  });
});
