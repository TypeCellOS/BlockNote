import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { FormattingToolbar } from "@blocknote/react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("FormattingToolbar unmount", () => {
  let div: HTMLDivElement;

  beforeEach(() => {
    div = document.createElement("div");
    document.body.appendChild(div);
  });

  afterEach(() => {
    document.body.removeChild(div);
  });

  it("should not throw error when unmounting editor with FormattingToolbar", () => {
    const editor = BlockNoteEditor.create();

    const root = createRoot(div);

    // Mount the editor with FormattingToolbar
    // This will cause CreateLinkButton to mount and register its event listeners
    flushSync(() => {
      root.render(
        <BlockNoteView editor={editor}>
          <FormattingToolbar />
        </BlockNoteView>,
      );
    });

    // Unmount should not throw error
    // Before the fix in commit 17bff6362, this would throw:
    // "Cannot read properties of undefined (reading 'removeEventListener')"
    // because CreateLinkButton's useEffect cleanup tries to  access
    // editor.prosemirrorView.dom.removeEventListener()
    // but prosemirrorView.dom is undefined when the editor is being destroyed
    expect(() => {
      root.unmount();
    }).not.toThrow();

    // Cleanup
    editor._tiptapEditor.destroy();
  });

  it("should handle rapid mount/unmount cycles", () => {
    // Test multiple mount/unmount cycles
    for (let i = 0; i < 3; i++) {
      const editor = BlockNoteEditor.create();
      const root = createRoot(div);

      flushSync(() => {
        root.render(
          <BlockNoteView editor={editor}>
            <FormattingToolbar />
          </BlockNoteView>,
        );
      });

      // Should not throw on unmount
      expect(() => {
        root.unmount();
      }).not.toThrow();

      editor._tiptapEditor.destroy();
    }
  });
});
