import { LinkToolbarExtension } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { describe, expect, vi } from "vite-plus/test";

import { createRemountRoot } from "./createRemountRoot.js";

// https://github.com/TypeCellOS/BlockNote/pull/2335
describe("BlockNoteView new editor + hover", () => {
  it("only notifies the new editor when the editable element is reused", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { editor: editor1 } = await setupEditor({ mountType: false });
    const { editor: editor2 } = await setupEditor({ mountType: false });
    const root = createRemountRoot(onTestFinished);
    const linkToolbar = editor1.getExtension(LinkToolbarExtension);
    const nextLinkToolbar = editor2.getExtension(LinkToolbarExtension);
    if (!linkToolbar || !nextLinkToolbar) {
      throw new Error("Expected the default link toolbar extension");
    }
    const lookup = vi.spyOn(linkToolbar, "getLinkAtElement");
    const nextLookup = vi.spyOn(nextLinkToolbar, "getLinkAtElement");
    onTestFinished(() => {
      lookup.mockRestore();
      nextLookup.mockRestore();
    });

    function render(editor: typeof editor1) {
      flushSync(() => {
        root.render(
          <StrictMode>
            <BlockNoteView editor={editor} />
          </StrictMode>,
        );
      });
    }

    render(editor1);
    render(editor1);
    await expect.poll(() => editor1.domElement?.isConnected).toBe(true);
    const previousElement = editor1.domElement!;
    previousElement.dispatchEvent(
      new MouseEvent("mouseover", { bubbles: true }),
    );
    expect(lookup).toHaveBeenCalledWith(previousElement);
    lookup.mockClear();

    render(editor2);
    await expect.poll(() => editor2.domElement?.isConnected).toBe(true);
    expect(editor2.domElement).toBe(previousElement);
    // The editable element is connected before the new toolbar effect
    // subscribes. Probe with a non-link target, which does not change state.
    await expect
      .poll(() => {
        previousElement.dispatchEvent(
          new MouseEvent("mouseover", { bubbles: true }),
        );
        return nextLookup.mock.calls.length;
      })
      .toBe(1);
    expect(lookup).not.toHaveBeenCalled();
    expect(nextLookup).toHaveBeenCalledWith(previousElement);
  });
});
