import { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";

import { userEvent } from "../../utils/context.js";
import { sleep, waitForSelector } from "../../utils/editor.js";
import { clickAt } from "../../utils/mouse.js";

let editor: BlockNoteEditor;

function Editor() {
  editor = useCreateBlockNote({
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

/** Counts the updates of the suggestion menu's state from now on. */
function countMenuUpdates() {
  const counter = { updates: 0 };
  editor.getExtension(SuggestionMenu)!.store.subscribe(() => {
    counter.updates++;
  });
  return counter;
}

// #2771: each update re-rendered and repositioned the menu while it was being
// scrolled, so a menu with little room never scrolled to its end.
test("scrolling the slash menu does not update its position", async () => {
  await render(<Editor />);
  await waitForSelector(".bn-editor");
  const menu = await openSlashMenuAt(innerHeight * 0.85);
  const counter = countMenuUpdates();

  for (let i = 0; i < 5; i++) {
    menu.scrollTop += 100;
    await sleep(50);
  }
  // WebKit delivers the scroll events late, in one batch.
  await sleep(1000);

  expect(counter.updates).toBe(0);
});

test("scrolling the page still updates the slash menu's position", async () => {
  await render(<Editor />);
  await waitForSelector(".bn-editor");
  await openSlashMenuAt(innerHeight * 0.5);
  const counter = countMenuUpdates();

  document.scrollingElement!.scrollTop += 50;
  // WebKit delivers the scroll event late (about a second).
  await vi.waitFor(() => expect(counter.updates).toBeGreaterThan(0), {
    timeout: 3000,
  });
});
