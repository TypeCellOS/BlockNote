import { filterSuggestionItems } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { afterEach, expect, test } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { sleep, waitForSelector } from "../../utils/editor.js";
import { clickAt } from "../../utils/mouse.js";

// Where the slash menu goes relative to its trigger (#2771): below, unless
// there is too little room there and more room above. It keeps its side
// while the user filters the items.

/** How long the slash menu items take to load, with `slowItems`. */
const ITEMS_DELAY = 500;

function Editor(props: { slowItems?: boolean }) {
  const editor = useCreateBlockNote({
    initialContent: Array.from({ length: 40 }, (_, i) => ({
      type: "paragraph" as const,
      content: `Paragraph ${i}`,
    })),
  });
  if (!props.slowItems) {
    return <BlockNoteView editor={editor} />;
  }
  // Items that load asynchronously, e.g. from a server.
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) => {
          await sleep(ITEMS_DELAY);
          return filterSuggestionItems(
            getDefaultReactSlashMenuItems(editor),
            query,
          );
        }}
      />
    </BlockNoteView>
  );
}

afterEach(async () => {
  await cleanup();
});

/** Opens the slash menu at the end of the paragraph at height `y`. */
async function openSlashMenuAt(
  y: number,
  options: { slowItems?: boolean; scrollTop?: number } = {},
) {
  await render(<Editor slowItems={options.slowItems} />);
  await waitForSelector(".bn-editor");
  if (options.scrollTop) {
    document.scrollingElement!.scrollTop = options.scrollTop;
    await sleep(100);
  }
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

/** The gap (px) between the menu and its trigger. */
function gap(menu: HTMLElement): number {
  const trigger = document
    .querySelector("[data-decoration-id]")!
    .getBoundingClientRect();
  const rect = menu.getBoundingClientRect();
  return side(menu) === "below"
    ? rect.top - trigger.bottom
    : trigger.top - rect.bottom;
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
  // A taller window than the default 720px, so the room below the trigger
  // (about 850px) is more than the maximum height.
  await page.viewport(1280, 1000);
  try {
    const menu = await openSlashMenuAt(innerHeight * 0.1);
    expect(side(menu)).toBe("below");
    const height = menu.getBoundingClientRect().height;
    expect(height).toBeLessThanOrEqual(600);
    expect(height).toBeGreaterThan(550);
    // The full list is longer, so it scrolls.
    expect(menu.scrollHeight).toBeGreaterThan(menu.clientHeight);
  } finally {
    await page.viewport(1280, 720);
  }
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
    // #2155: the shorter menu stays next to the trigger.
    expect(gap(menu)).toBeLessThan(15);
  }
  for (let i = 0; i < 5; i++) {
    await userEvent.keyboard("{Backspace}");
    await sleep(100);
    expect(side(menu)).toBe("above");
  }
});

test("goes above the trigger at once when the items load asynchronously", async () => {
  const menu = await openSlashMenuAt(innerHeight * 0.85, { slowItems: true });
  // The items are still loading: the menu is nearly empty, and still goes
  // above.
  expect(side(menu)).toBe("above");

  await sleep(ITEMS_DELAY + 300);
  expect(
    menu.querySelectorAll(".bn-suggestion-menu-item").length,
  ).toBeGreaterThan(5);
  expect(side(menu)).toBe("above");
});

test("chooses its side again when the page scrolls", async () => {
  // The page is scrolled down first, so it can scroll back up below.
  const menu = await openSlashMenuAt(innerHeight * 0.5, { scrollTop: 300 });
  expect(side(menu)).toBe("below");

  // Scrolling up moves the trigger down, near the bottom of the screen.
  document.scrollingElement!.scrollTop = 300 - innerHeight * 0.35;
  // WebKit delivers the scroll event late.
  await sleep(1000);
  expect(side(menu)).toBe("above");
});

test("chooses its side again when the window is resized", async () => {
  try {
    // About 300px below the trigger: the menu goes below.
    const menu = await openSlashMenuAt(innerHeight * 0.55);
    expect(side(menu)).toBe("below");

    // A shorter window (e.g. a phone's keyboard opens): little room is left
    // below the trigger, and more above.
    await page.viewport(1280, 480);
    await sleep(300);
    expect(side(menu)).toBe("above");
  } finally {
    await page.viewport(1280, 720);
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
