import { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { sleep, waitForSelector } from "../../utils/editor.js";

// Where the slash menu goes relative to its trigger (#2771): below, unless
// there is too little room there and more room above. It keeps its side
// while the user filters the items.

/** How long the slash menu items take to load, with `slowItems`. */
const ITEMS_DELAY = 500;

let editor: BlockNoteEditor;

function Editor(props: { slowItems?: boolean }) {
  editor = useCreateBlockNote({
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
  const menu = await typeSlashAt(y);
  await sleep(200);
  return menu;
}

/** Types "/" at the end of the paragraph at height `y`, in the editor. */
async function typeSlashAt(y: number) {
  const paragraph = [
    ...document.querySelectorAll('[data-content-type="paragraph"]'),
  ].find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top <= y && rect.bottom >= y;
  })!;
  // Through the API rather than a click: a window resized with
  // `page.viewport` is scaled, so mouse coordinates would miss.
  editor.setTextCursorPosition(
    paragraph
      .closest('[data-node-type="blockContainer"]')!
      .getAttribute("data-id")!,
    "end",
  );
  editor.focus();
  await userEvent.keyboard("/");
  return waitForSelector(".bn-suggestion-menu");
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
  // About 380px below the trigger, more above.
  const menu = await openSlashMenuAt(innerHeight * 0.45);
  expect(side(menu)).toBe("below");
});

test("goes above the trigger when the room below fits only a few items", async () => {
  // About 250px below the trigger: a menu there would show only about four
  // items, with more room above.
  const menu = await openSlashMenuAt(innerHeight * 0.62);
  expect(side(menu)).toBe("above");
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
  expect(menu.querySelectorAll(".bn-suggestion-menu-item")).toHaveLength(0);
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
  // WebKit delivers the scroll event late (about a second).
  await vi.waitFor(() => expect(side(menu)).toBe("above"), { timeout: 3000 });
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

/** The menu's width (px). */
function width(menu: HTMLElement): number {
  return Math.round(menu.getBoundingClientRect().width);
}

test("keeps its width while the user filters the items", async () => {
  const menu = await openSlashMenuAt(innerHeight * 0.15);
  const opened = width(menu);

  // "quo" leaves only short items, which on their own are narrower.
  for (const key of ["q", "u", "o"]) {
    await userEvent.keyboard(key);
    await sleep(100);
    expect(width(menu)).toBe(opened);
  }
  for (let i = 0; i < 3; i++) {
    await userEvent.keyboard("{Backspace}");
    await sleep(100);
    expect(width(menu)).toBe(opened);
  }
});

test("grows when the items load asynchronously, then keeps its width while filtering", async () => {
  const menu = await openSlashMenuAt(innerHeight * 0.15, { slowItems: true });
  const loading = width(menu);

  await sleep(ITEMS_DELAY + 300);
  const loaded = width(menu);
  // The items are wider than the menu while it loads: it grows.
  expect(loaded).toBeGreaterThan(loading);

  // Each query loads its items again.
  await userEvent.keyboard("quo");
  await sleep(ITEMS_DELAY + 300);
  expect(menu.querySelectorAll(".bn-suggestion-menu-item").length).toBeLessThan(
    5,
  );
  expect(width(menu)).toBe(loaded);
});

test("chooses its side and height again when opened again elsewhere", async () => {
  const first = await openSlashMenuAt(innerHeight * 0.15);
  expect(side(first)).toBe("below");

  await userEvent.keyboard("{Escape}");
  await sleep(400);
  const second = await typeSlashAt(innerHeight * 0.85);
  await sleep(200);
  expect(side(second)).toBe("above");
  // The room above, not the height it had below.
  expect(second.getBoundingClientRect().height).toBeGreaterThan(400);
});

test("starts at its own width when opened again", async () => {
  const first = await openSlashMenuAt(innerHeight * 0.15, {
    slowItems: true,
  });
  await sleep(ITEMS_DELAY + 300);
  const loaded = width(first);

  await userEvent.keyboard("{Escape}");
  // After the menu has faded out.
  await sleep(400);
  const second = await typeSlashAt(innerHeight * 0.3);
  // The items are loading again: the menu is as narrow as it was then, not
  // as wide as it was with its items.
  expect(width(second)).toBeLessThan(loaded);
});
