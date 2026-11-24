import "@blocknote/core/style.css";

import { BlockNoteSchema } from "@blocknote/core";
import { SourceBlockWithPreviewExtension } from "@blocknote/core/extensions";
import { flushSync } from "react-dom";
import { expect, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { createReactDiagramBlockSpec } from "./createReactDiagramBlockSpec.js";

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { diagram: createReactDiagramBlockSpec() },
});

it.for([false, true])(
  "only opens a diagram preview on click when editable (editable: %s)",
  async (editable, { setupEditor }) => {
    const { editor, rootNode: host } = await setupEditor({
      skin: "raw",
      props: { editable },
      schema,
      trailingBlock: false,
      initialContent: [
        { id: "diagram", type: "diagram", content: "graph TD; A --> B" },
      ],
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
  },
);
