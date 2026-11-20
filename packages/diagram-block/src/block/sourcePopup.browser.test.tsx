import "@blocknote/core/style.css";

import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { SourceBlockWithPreviewExtension } from "@blocknote/core/extensions";
import { BlockNoteViewRaw } from "@blocknote/react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { createReactDiagramBlockSpec } from "./createReactDiagramBlockSpec.js";

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { diagram: createReactDiagramBlockSpec() },
});

it.each([false, true])(
  "only opens a diagram preview on click when editable (editable: %s)",
  async (editable) => {
    const editor = BlockNoteEditor.create({
      schema,
      trailingBlock: false,
      initialContent: [
        { id: "diagram", type: "diagram", content: "graph TD; A --> B" },
      ],
    });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    try {
      flushSync(() => {
        root.render(<BlockNoteViewRaw editor={editor} editable={editable} />);
      });

      const preview = await vi.waitFor(() => {
        const preview = host.querySelector<HTMLElement>("[role='img']");
        if (!preview) {
          throw new Error("Diagram preview not rendered yet");
        }
        return preview;
      });
      const extension = editor.getExtension(SourceBlockWithPreviewExtension)!;
      flushSync(() => editor.setTextCursorPosition("diagram", "end"));
      expect(extension.store.state.selected).toBe("diagram");
      // Unlike inline math, selecting a diagram never opens its popup.
      expect(extension.store.state.popupOpen).toBeUndefined();

      await userEvent.click(preview);
      expect(extension.store.state.popupOpen).toBe(
        editable ? "diagram" : undefined,
      );
      await vi.waitFor(() =>
        expect(
          host
            .querySelector(".bn-preview-with-source-popup")
            ?.getAttribute("data-open"),
        ).toBe(String(editable)),
      );

      if (!editable) {
        const content = editor.getBlock("diagram")?.content;
        await userEvent.keyboard("{Enter}");
        expect(extension.store.state.popupOpen).toBeUndefined();
        expect(editor.getBlock("diagram")?.content).toEqual(content);
      }
    } finally {
      root.unmount();
      editor._tiptapEditor.destroy();
      host.remove();
    }
  },
);
