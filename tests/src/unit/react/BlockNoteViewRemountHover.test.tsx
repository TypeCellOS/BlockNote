import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// https://github.com/TypeCellOS/BlockNote/pull/2335
describe("BlockNoteView new editor + hover", () => {
  let div: HTMLDivElement;

  beforeEach(() => {
    div = document.createElement("div");
    document.body.appendChild(div);
  });

  afterEach(() => {
    document.body.removeChild(div);
  });

  it("should not throw error when replacing editor in same container and mouseovering", async () => {
    // 1. Setup container
    const editor1 = BlockNoteEditor.create();
    const root = createRoot(div);

    // 2. Render first editor twice
    flushSync(() => {
      root.render(
        <React.StrictMode>
          <BlockNoteView editor={editor1} />
        </React.StrictMode>,
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync(() => {
      root.render(
        <React.StrictMode>
          <BlockNoteView editor={editor1} />
        </React.StrictMode>,
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const editor1DomElement = editor1.domElement;
    expect(editor1DomElement).toBeDefined();

    // 3. Replace with new editor in same container
    // This causes LinkToolbarController of editor1 to unmount and editor2 to mount
    const editor2 = BlockNoteEditor.create();
    flushSync(() => {
      root.render(
        <React.StrictMode>
          <BlockNoteView editor={editor2} />
        </React.StrictMode>,
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const editor2DomElement = editor2.domElement;
    expect(editor2DomElement).toBeDefined();

    // 4. Simulate mouseover on the OLD element.
    // If the listener was leaked (due to editor.domElement being null/changed at cleanup),
    // this will fire the callback. callback uses editor1 which might be in bad state -> Crash.

    expect(() => {
      editor1DomElement!.dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true }),
      );
    }).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Cleanup
    editor1._tiptapEditor.destroy();
    editor2._tiptapEditor.destroy();
    root.unmount();
  });
});
