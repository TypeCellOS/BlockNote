import { BlockNoteEditor } from "@blocknote/core";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, test } from "vite-plus/test";
import { BlockNoteViewRaw } from "../editor/BlockNoteView.js";
import { useEditorDirection } from "./useEditorDirection.js";

function Probe() {
  return <output>{useEditorDirection()}</output>;
}

test("direction follows committed React dir updates without remounting the editor", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const editor = BlockNoteEditor.create();
  try {
    let editorDOM: HTMLElement | undefined;
    for (const direction of ["ltr", "rtl", "ltr"] as const) {
      flushSync(() =>
        root.render(
          <BlockNoteViewRaw editor={editor} dir={direction}>
            <Probe />
          </BlockNoteViewRaw>,
        ),
      );
      await expect
        .poll(() => container.querySelector("output")?.textContent)
        .toBe(direction);
      if (editorDOM) {
        expect(editor.domElement).toBe(editorDOM);
      }
      editorDOM = editor.domElement;
    }
  } finally {
    flushSync(() => root.unmount());
    editor._tiptapEditor.destroy();
    container.remove();
  }
});
