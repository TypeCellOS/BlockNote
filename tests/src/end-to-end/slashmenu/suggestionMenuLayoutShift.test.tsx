import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";

import { userEvent } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";

let editor: BlockNoteEditor;

/** An editor in a scroll container, like an editor in a form or panel. */
function Editor() {
  editor = useCreateBlockNote({
    initialContent: [{ type: "paragraph", content: "Hello" }],
  });
  return (
    <div
      data-testid="scroll-container"
      style={{ maxHeight: 200, overflowY: "auto" }}
    >
      <BlockNoteView editor={editor} />
    </div>
  );
}

afterEach(async () => {
  await cleanup();
});

/** The slash menu's floating element and its trigger character. */
function menuAndTrigger() {
  const floating = document.querySelector(
    ".bn-suggestion-menu",
  )!.parentElement!;
  const trigger = document
    .querySelector(".bn-suggestion-decorator")!
    .getBoundingClientRect();
  return {
    visibility: getComputedStyle(floating).visibility,
    gap: floating.getBoundingClientRect().top - trigger.bottom,
  };
}

// A layout shift outside the editor (e.g. a banner that appears above it)
// moves the trigger without a transaction or a scroll event. The menu must
// follow the trigger, rather than stay where the trigger was when the menu
// opened, where the editor's scroll container clips it and hides the menu.
test("the slash menu follows its trigger after a layout shift", async () => {
  await render(<Editor />);
  await waitForSelector(".bn-editor");
  editor.setTextCursorPosition(editor.document[0], "end");
  editor.focus();
  await userEvent.keyboard("/");
  await waitForSelector(".bn-suggestion-menu");
  await vi.waitFor(() =>
    expect(menuAndTrigger()).toMatchObject({ visibility: "visible" }),
  );
  const { gap } = menuAndTrigger();

  const banner = document.createElement("div");
  banner.style.height = "60px";
  document.querySelector('[data-testid="scroll-container"]')!.before(banner);

  await vi.waitFor(() => {
    const after = menuAndTrigger();
    expect(after.visibility).toBe("visible");
    expect(after.gap).toBeCloseTo(gap, 0);
  });
});
