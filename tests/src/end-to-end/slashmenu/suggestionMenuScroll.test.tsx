import type { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { expect, vi } from "vite-plus/test";

import { userEvent } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";
import { clickAt } from "../../utils/mouse.js";

// The browser setup installs this fixture but sits outside tests/tsconfig.json.
const initialContent = Array.from({ length: 40 }, (_, i) => ({
  type: "paragraph" as const,
  content: `Paragraph ${i}`,
}));

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
  await waitForSelector('.bn-suggestion-menu [role="option"]');
  await vi.waitFor(() =>
    expect(menu.scrollHeight).toBeGreaterThan(menu.clientHeight),
  );
  return menu;
}

/** Counts the updates of the suggestion menu's state from now on. */
function countMenuUpdates(editor: BlockNoteEditor) {
  const counter = { updates: 0 };
  editor.getExtension(SuggestionMenu)!.store.subscribe(() => {
    counter.updates++;
  });
  return counter;
}

// #2771: each update re-rendered and repositioned the menu while it was being
// scrolled, so a menu with little room never scrolled to its end.
it("scrolling the slash menu does not update its position", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({ initialContent });
  const menu = await openSlashMenuAt(innerHeight * 0.85);
  const counter = countMenuUpdates(editor);

  const initialScrollTop = menu.scrollTop;
  let deliveredScrollTop = initialScrollTop;
  function onScroll() {
    deliveredScrollTop = menu.scrollTop;
  }
  menu.addEventListener("scroll", onScroll);
  try {
    for (let i = 0; i < 5; i++) {
      menu.scrollTop += 100;
      await new Promise(requestAnimationFrame);
    }
    const finalScrollTop = menu.scrollTop;
    expect(finalScrollTop).toBeGreaterThan(initialScrollTop);
    // WebKit can deliver these late, in one batch. Wait for the actual event
    // so a broken scroll listener cannot pass by not having run yet.
    await vi.waitFor(() => expect(deliveredScrollTop).toBe(finalScrollTop), {
      timeout: 3000,
    });
  } finally {
    menu.removeEventListener("scroll", onScroll);
  }

  expect(counter.updates).toBe(0);
});

it("scrolling the page still updates the slash menu's position", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({ initialContent });
  await openSlashMenuAt(innerHeight * 0.5);
  const trigger = await waitForSelector("[data-decoration-id]");
  const { store } = editor.getExtension(SuggestionMenu)!;
  await vi.waitFor(
    () =>
      expect(store.state?.referencePos.top).toBeCloseTo(
        trigger.getBoundingClientRect().top,
      ),
    { timeout: 3000 },
  );
  const initialTop = trigger.getBoundingClientRect().top;

  document.scrollingElement!.scrollTop += 50;
  // Require the anchor to move and the new position to reach the store.
  // An update count alone can include an outstanding event from menu opening.
  // WebKit can deliver the page scroll event late.
  await vi.waitFor(
    () => {
      const triggerTop = trigger.getBoundingClientRect().top;
      expect(triggerTop).toBeLessThan(initialTop);
      expect(store.state?.referencePos.top).toBeCloseTo(triggerTop);
    },
    { timeout: 3000 },
  );
});
