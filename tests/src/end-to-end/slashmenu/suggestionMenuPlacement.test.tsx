import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { afterEach, expect, test } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";

import { userEvent } from "../../utils/context.js";
import { sleep, waitForSelector } from "../../utils/editor.js";
import { clickAt } from "../../utils/mouse.js";

// Where the slash menu goes relative to its trigger (#2771): below, unless
// there is too little room there and more room above. It keeps its side
// while the user filters the items.

function Editor() {
  const editor = useCreateBlockNote({
    initialContent: Array.from({ length: 40 }, (_, i) => ({
      type: "paragraph" as const,
      content: `Paragraph ${i}`,
    })),
  });
  return <BlockNoteView editor={editor} />;
}

afterEach(async () => {
  await cleanup();
});

/** Opens the slash menu at the end of the paragraph at height `y`. */
async function openSlashMenuAt(y: number) {
  await render(<Editor />);
  await waitForSelector(".bn-editor");
  const paragraph = [
    ...document.querySelectorAll('[data-content-type="paragraph"]'),
  ].find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top <= y && rect.bottom >= y;
  })!;
  const rect = paragraph.getBoundingClientRect();
  await clickAt(rect.right - 2, rect.top + rect.height / 2);
  await userEvent.keyboard("{End}/");
  const menu = await waitForSelector(".bn-suggestion-menu");
  await sleep(200);
  return menu;
}

/** The side of the trigger the menu is on. */
function side(menu: HTMLElement): "above" | "below" {
  const trigger = document
    .querySelector("[data-decoration-id]")!
    .getBoundingClientRect();
  return menu.getBoundingClientRect().top > trigger.top ? "below" : "above";
}

test("stays below the trigger when there is enough room, even with more room above", async () => {
  // About 300px below the trigger, more above.
  const menu = await openSlashMenuAt(innerHeight * 0.55);
  expect(side(menu)).toBe("below");
});

test("is no taller than its maximum height, even with more room", async () => {
  // About 600px below the trigger.
  const menu = await openSlashMenuAt(innerHeight * 0.1);
  expect(side(menu)).toBe("below");
  expect(menu.getBoundingClientRect().height).toBeLessThanOrEqual(400);
  // The full list is longer, so it scrolls.
  expect(menu.scrollHeight).toBeGreaterThan(menu.clientHeight);
});

test("goes above the trigger when there is too little room below", async () => {
  const menu = await openSlashMenuAt(innerHeight * 0.85);
  expect(side(menu)).toBe("above");
  // Not squeezed: it gets the room above.
  expect(menu.getBoundingClientRect().height).toBeGreaterThan(200);
});

test("keeps its side while the user filters the items", async () => {
  // About 150px below the trigger: the full list goes above, and the
  // filtered list would fit below.
  const menu = await openSlashMenuAt(innerHeight - 170);
  expect(side(menu)).toBe("above");

  for (const key of ["q", "u", "o", "t", "e"]) {
    await userEvent.keyboard(key);
    await sleep(100);
    expect(side(menu)).toBe("above");
  }
  for (let i = 0; i < 5; i++) {
    await userEvent.keyboard("{Backspace}");
    await sleep(100);
    expect(side(menu)).toBe("above");
  }
});

test("shows the last item when it is selected near the bottom of the screen", async () => {
  const menu = await openSlashMenuAt(innerHeight * 0.85);

  // ArrowUp from the first item selects the last one.
  await userEvent.keyboard("{ArrowUp}");
  await sleep(300);

  const selected = menu.querySelector('[aria-selected="true"]')!;
  const item = selected.getBoundingClientRect();
  const visible = menu.getBoundingClientRect();
  expect(item.top).toBeGreaterThanOrEqual(visible.top - 1);
  expect(item.bottom).toBeLessThanOrEqual(visible.bottom + 1);
});
