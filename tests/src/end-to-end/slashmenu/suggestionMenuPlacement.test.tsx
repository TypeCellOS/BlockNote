import type { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import "@blocknote/mantine/style.css";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
} from "@blocknote/react";
import { expect, vi } from "vite-plus/test";

import type { SetupEditor } from "../../commands/browser/setupEditor.js";
import { page, userEvent } from "../../utils/context.js";
import {
  waitForSelector,
  waitForSelectorDetached,
} from "../../utils/editor.js";

// Where the slash menu goes relative to its trigger (#2771): below, unless
// there is too little room there and more room above. It keeps its side
// while the user filters the items.

const MENU = ".bn-suggestion-menu";
const ITEM = ".bn-suggestion-menu-item";

let editor: BlockNoteEditor;

/** Opens the slash menu at the end of the paragraph at height `y`. */
async function openSlashMenuAt(
  setupEditor: SetupEditor,
  y: number,
  options: { waitForItems?: () => Promise<void>; scrollTop?: number } = {},
) {
  const { waitForItems } = options;
  ({ editor } = await setupEditor({
    initialContent: Array.from({ length: 40 }, (_, i) => ({
      type: "paragraph" as const,
      content: `Paragraph ${i}`,
    })),
    // Items that load asynchronously, e.g. from a server.
    props: waitForItems ? { slashMenu: false } : undefined,
    children: waitForItems
      ? ({ editor }) => (
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) => {
              await waitForItems();
              return filterSuggestionItems(
                getDefaultReactSlashMenuItems(editor),
                query,
              );
            }}
          />
        )
      : undefined,
  }));
  if (options.scrollTop) {
    document.scrollingElement!.scrollTop = options.scrollTop;
  }
  return typeSlashAt(y, options.waitForItems ? "loading" : "loaded");
}

/** Types "/" at the end of the paragraph at height `y`, in the editor. */
async function typeSlashAt(y: number, items: "loading" | "loaded" = "loaded") {
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
  const menu = await waitForSelector(MENU);
  if (items === "loaded") {
    await waitForResults(menu, "");
  } else {
    await waitForSelector(`${MENU} .bn-suggestion-menu-loader`);
    await waitForPlacement(menu);
  }
  return menu;
}

async function waitForPlacement(menu: HTMLElement) {
  await vi.waitFor(() => expect(Math.abs(gap(menu))).toBeLessThan(15));
}

async function waitForResults(menu: HTMLElement, query: string) {
  const titles = filterSuggestionItems(
    getDefaultReactSlashMenuItems(editor),
    query,
  ).map((item) => item.title);
  await vi.waitFor(() =>
    expect(
      Array.from(
        menu.querySelectorAll(".bn-mt-suggestion-menu-item-title"),
        (item) => item.textContent,
      ),
    ).toEqual(titles),
  );
  // Item commits can resize the menu. Allow Floating UI's resize observation
  // and the resulting position update before asserting unchanged geometry.
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  await waitForPlacement(menu);
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

it("stays below the trigger when there is enough room, even with more room above", async ({
  setupEditor,
}) => {
  // About 380px below the trigger, more above.
  const menu = await openSlashMenuAt(setupEditor, innerHeight * 0.45);
  expect(side(menu)).toBe("below");
});

it("goes above the trigger when the room below fits only a few items", async ({
  setupEditor,
}) => {
  // About 250px below the trigger: a menu there would show only about four
  // items, with more room above.
  const menu = await openSlashMenuAt(setupEditor, innerHeight * 0.62);
  expect(side(menu)).toBe("above");
});

it("is no taller than its maximum height, even with more room", async ({
  setupEditor,
}) => {
  // A taller window than the default 720px, so the room below the trigger
  // (about 850px) is more than the maximum height.
  await page.viewport(1280, 1000);
  try {
    const menu = await openSlashMenuAt(setupEditor, innerHeight * 0.1);
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

it("goes above the trigger when there is too little room below", async ({
  setupEditor,
}) => {
  const menu = await openSlashMenuAt(setupEditor, innerHeight * 0.85);
  expect(side(menu)).toBe("above");
  // Not squeezed: it gets the room above.
  expect(menu.getBoundingClientRect().height).toBeGreaterThan(200);
});

it("keeps its side while the user filters the items", async ({
  setupEditor,
}) => {
  // About 150px below the trigger: the full list goes above, and the
  // filtered list would fit below.
  const menu = await openSlashMenuAt(setupEditor, innerHeight - 170);
  expect(side(menu)).toBe("above");

  const query = "quote";
  for (let i = 0; i < query.length; i++) {
    await userEvent.keyboard(query[i]);
    await waitForResults(menu, query.slice(0, i + 1));
    expect(side(menu)).toBe("above");
    // #2155: the shorter menu stays next to the trigger.
    expect(gap(menu)).toBeLessThan(15);
  }
  for (let i = query.length - 1; i >= 0; i--) {
    await userEvent.keyboard("{Backspace}");
    await waitForResults(menu, query.slice(0, i));
    expect(side(menu)).toBe("above");
  }
});

it("goes above the trigger at once when the items load asynchronously", async ({
  setupEditor,
}) => {
  const items = Promise.withResolvers<void>();
  const menu = await openSlashMenuAt(setupEditor, innerHeight * 0.85, {
    waitForItems: () => items.promise,
  });
  // The items are still loading: the menu is nearly empty, and still goes
  // above.
  expect(menu.querySelectorAll(ITEM)).toHaveLength(0);
  expect(side(menu)).toBe("above");

  items.resolve();
  await waitForResults(menu, "");
  expect(menu.querySelectorAll(ITEM).length).toBeGreaterThan(5);
  expect(side(menu)).toBe("above");
});

it("chooses its side again when the page scrolls", async ({ setupEditor }) => {
  // The page is scrolled down first, so it can scroll back up below.
  const menu = await openSlashMenuAt(setupEditor, innerHeight * 0.5, {
    scrollTop: 300,
  });
  expect(side(menu)).toBe("below");

  // Scrolling up moves the trigger down, near the bottom of the screen.
  document.scrollingElement!.scrollTop = 300 - innerHeight * 0.35;
  // WebKit delivers the scroll event late (about a second).
  await vi.waitFor(() => expect(side(menu)).toBe("above"), { timeout: 3000 });
});

it("chooses its side again when the window is resized", async ({
  setupEditor,
}) => {
  try {
    // About 300px below the trigger: the menu goes below.
    const menu = await openSlashMenuAt(setupEditor, innerHeight * 0.55);
    expect(side(menu)).toBe("below");

    // A shorter window (e.g. a phone's keyboard opens): little room is left
    // below the trigger, and more above.
    await page.viewport(1280, 480);
    await vi.waitFor(() => expect(side(menu)).toBe("above"));
  } finally {
    await page.viewport(1280, 720);
  }
});

it("shows the last item when it is selected near the bottom of the screen", async ({
  setupEditor,
}) => {
  const menu = await openSlashMenuAt(setupEditor, innerHeight * 0.85);

  // ArrowUp from the first item selects the last one.
  await userEvent.keyboard("{ArrowUp}");
  const last = Array.from(menu.querySelectorAll(ITEM)).at(-1)!;
  await vi.waitFor(() => {
    expect(last.getAttribute("aria-selected")).toBe("true");
    const item = last.getBoundingClientRect();
    const visible = menu.getBoundingClientRect();
    expect(item.top).toBeGreaterThanOrEqual(visible.top - 1);
    expect(item.bottom).toBeLessThanOrEqual(visible.bottom + 1);
  });
});

/** The menu's width (px). */
function width(menu: HTMLElement): number {
  return Math.round(menu.getBoundingClientRect().width);
}

it("keeps its width while the user filters the items", async ({
  setupEditor,
}) => {
  const menu = await openSlashMenuAt(setupEditor, innerHeight * 0.15);
  const opened = width(menu);

  // "quo" leaves only short items, which on their own are narrower.
  const query = "quo";
  for (let i = 0; i < query.length; i++) {
    await userEvent.keyboard(query[i]);
    await waitForResults(menu, query.slice(0, i + 1));
    expect(width(menu)).toBe(opened);
  }
  for (let i = query.length - 1; i >= 0; i--) {
    await userEvent.keyboard("{Backspace}");
    await waitForResults(menu, query.slice(0, i));
    expect(width(menu)).toBe(opened);
  }
});

it("grows when the items load asynchronously, then keeps its width while filtering", async ({
  setupEditor,
}) => {
  let items = Promise.withResolvers<void>();
  const menu = await openSlashMenuAt(setupEditor, innerHeight * 0.15, {
    waitForItems: () => items.promise,
  });
  const loading = width(menu);

  items.resolve();
  await waitForResults(menu, "");
  const loaded = width(menu);
  // The items are wider than the menu while it loads: it grows.
  expect(loaded).toBeGreaterThan(loading);

  // Each query loads its items again.
  items = Promise.withResolvers<void>();
  await userEvent.keyboard("quo");
  await waitForSelector(`${MENU} .bn-suggestion-menu-loader`);
  items.resolve();
  await waitForResults(menu, "quo");
  expect(menu.querySelectorAll(ITEM).length).toBeLessThan(5);
  expect(width(menu)).toBe(loaded);
});

it("chooses its side and height again when opened again elsewhere", async ({
  setupEditor,
}) => {
  const first = await openSlashMenuAt(setupEditor, innerHeight * 0.15);
  expect(side(first)).toBe("below");

  await userEvent.keyboard("{Escape}");
  await waitForSelectorDetached(MENU);
  const second = await typeSlashAt(innerHeight * 0.85);
  expect(side(second)).toBe("above");
  // The room above, not the height it had below.
  expect(second.getBoundingClientRect().height).toBeGreaterThan(400);
});

it("starts at its own width when opened again", async ({ setupEditor }) => {
  let items = Promise.withResolvers<void>();
  const first = await openSlashMenuAt(setupEditor, innerHeight * 0.15, {
    waitForItems: () => items.promise,
  });
  items.resolve();
  await waitForResults(first, "");
  const loaded = width(first);

  await userEvent.keyboard("{Escape}");
  await waitForSelectorDetached(MENU);
  items = Promise.withResolvers<void>();
  const second = await typeSlashAt(innerHeight * 0.3, "loading");
  // The items are loading again: the menu is as narrow as it was then, not
  // as wide as it was with its items.
  expect(width(second)).toBeLessThan(loaded);
  items.resolve();
});
