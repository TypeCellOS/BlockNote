import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { FormattingToolbar } from "@blocknote/react";
import { flushSync } from "react-dom";
import { describe, expect } from "vite-plus/test";

import { createRemountRoot } from "./createRemountRoot.js";

describe("FormattingToolbar unmount", () => {
  it("should not throw error when unmounting editor with FormattingToolbar", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { editor } = await setupEditor({ mountType: false });

    const root = createRemountRoot(onTestFinished);

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
    // remove listeners from the editor DOM after that element is gone.
    expect(() => {
      root.unmount();
    }).not.toThrow();
  });

  it("should handle rapid mount/unmount cycles", async ({
    setupEditor,
    onTestFinished,
  }) => {
    // Test multiple mount/unmount cycles
    for (let i = 0; i < 3; i++) {
      const { editor } = await setupEditor({ mountType: false });
      const root = createRemountRoot(onTestFinished);

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
    }
  });
});
