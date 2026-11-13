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
    <div style={{ maxHeight: 200, overflowY: "auto" }}>
      <BlockNoteView editor={editor} />
    </div>
  );
}

afterEach(async () => {
  await cleanup();
});

/** The slash menu's floating element, measured from its trigger character. */
function menuAndTrigger() {
  const floating = document.querySelector(
    ".bn-suggestion-menu",
  )!.parentElement!;
  const menu = floating.getBoundingClientRect();
  const trigger = document
    .querySelector(".bn-suggestion-decorator")!
    .getBoundingClientRect();
  return {
    visibility: getComputedStyle(floating).visibility,
    dx: menu.left - trigger.left,
    dy: menu.top - trigger.bottom,
  };
}

async function openSlashMenu() {
  await render(<Editor />);
  await waitForSelector(".bn-editor");
  editor.setTextCursorPosition(editor.document[0], "end");
  editor.focus();
  await userEvent.keyboard("/");
  await waitForSelector(".bn-suggestion-menu");
  await vi.waitFor(() =>
    expect(menuAndTrigger()).toMatchObject({ visibility: "visible" }),
  );
  return menuAndTrigger();
}

async function expectMenuOnTrigger(before: { dx: number; dy: number }) {
  await vi.waitFor(() => {
    const after = menuAndTrigger();
    expect(after.visibility).toBe("visible");
    expect(after.dx).toBeCloseTo(before.dx, 0);
    expect(after.dy).toBeCloseTo(before.dy, 0);
  });
}

// A layout shift (e.g. a banner that appears) moves the trigger without a
// transaction or a scroll event. The menu must follow the trigger, rather than
// stay where the trigger was when the menu opened. The banner goes between
// the menu's portal and the editor, so only the editor moves: the menu can
// only reach the trigger again by measuring it.
test("the slash menu follows its trigger after a layout shift", async () => {
  const before = await openSlashMenu();

  const banner = document.createElement("div");
  banner.style.height = "60px";
  editor.domElement!.before(banner);

  await expectMenuOnTrigger(before);
});

// A transaction can move the trigger sideways without resizing or moving the
// editor (here, centring the text), so only the transaction tells the menu to
// measure again.
test("the slash menu follows its trigger when a transaction moves it", async () => {
  const before = await openSlashMenu();

  editor.updateBlock(editor.document[0], {
    props: { textAlignment: "center" },
  });

  await expectMenuOnTrigger(before);
});
