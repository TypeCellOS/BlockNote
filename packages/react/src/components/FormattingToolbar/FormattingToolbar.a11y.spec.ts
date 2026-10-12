import type { PartialBlock } from "@blocknote/core";
import { expect, test, afterEach } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import {
  openEditor,
  checkAxe,
  pressKey,
  readSelection,
  saveTranscript,
  selectToLineEndKey,
  screenReader,
} from "../../../../../tests/a11y/helpers.js";

// This vertical slice covers controls shown for a basic text selection only.
// TODO: Cover context-specific toolbar items with axe, keyboard interactions,
// focus screenshots and screen-reader announcements:
// - File/media blocks: caption, replace, rename, delete, download and preview.
// - Table cell selections: merge cells.
// - Editors with commenting/collaboration configured: AddCommentButton and
//   AddTiptapCommentButton, including their resulting comment UI.
// The 12-button assertion below describes this fixture, not the entire toolbar.
const toolbarDocument: PartialBlock[] = [
  { id: "preceding", type: "paragraph", content: "Preceding paragraph" },
  { id: "format", type: "paragraph", content: "Format this text" },
  { id: "following", type: "paragraph", content: "Following paragraph" },
];

afterEach(async () => {
  await saveTranscript();
});

// Each test supplies its document before this keyboard-only toolbar setup.
// Setup stops before activation so each test owns its action and assertions.
async function setupToolbar(control: string) {
  await pressKey("Tab");
  await expect.element(page.getByRole("textbox")).toHaveFocus();
  await pressKey("ArrowDown");
  await pressKey(selectToLineEndKey);
  await expect.poll(async () => readSelection().text).toBe("Format this text");
  const toolbar = page.getByRole("toolbar");
  await expect.element(toolbar).toBeVisible();
  await checkAxe();
  await expect.poll(() => toolbar.getByRole("button").all().length).toBe(12);

  const button = toolbar.getByRole("button", { name: control, exact: true });
  await expect.element(button).toBeEnabled();
  // Bound traversal to report unreachable controls without looping forever.
  for (let step = 0; step < 15; step++) {
    if (button.element() === document.activeElement) {
      break;
    }
    await pressKey("Tab");
  }
  await expect
    .element(button, { message: `${control} is reachable with Tab` })
    .toHaveFocus();
  if (!screenReader) {
    // Compare keyboard focus before Enter returns focus to the editor.
    await expect
      .element(toolbar)
      .toMatchScreenshot(
        `focus-${control.toLowerCase().replaceAll(" ", "-")}.png`,
        {},
      );
  }
  return { toolbar, button };
}

test("formatting toolbar: Paragraph", async () => {
  await openEditor(toolbarDocument);
  const { toolbar } = await setupToolbar("Paragraph");
  await pressKey("Enter");
  const menu = page.getByRole("menu");
  await expect.element(menu).toBeVisible();
  await pressKey("ArrowDown");
  await pressKey("Home");
  await expect.element(menu.getByRole("menuitem").first()).toHaveFocus();
  if (!screenReader) {
    await expect
      .element(menu)
      .toMatchScreenshot("focus-block-type-menu-item.png", {});
  }
  await pressKey("Escape");
  await expect.element(toolbar).not.toBeInTheDocument();
  await expect.element(page.getByRole("textbox")).toHaveFocus();
});

test("formatting toolbar: Bold", async () => {
  await openEditor(toolbarDocument);
  const { button } = await setupToolbar("Bold");
  await pressKey("Enter");
  await expect.element(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Italic", async () => {
  await openEditor(toolbarDocument);
  const { button } = await setupToolbar("Italic");
  await pressKey("Enter");
  await expect.element(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Underline", async () => {
  await openEditor(toolbarDocument);
  const { button } = await setupToolbar("Underline");
  await pressKey("Enter");
  await expect.element(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Strike", async () => {
  await openEditor(toolbarDocument);
  const { button } = await setupToolbar("Strike");
  await pressKey("Enter");
  await expect.element(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Align text left", async () => {
  await openEditor(toolbarDocument);
  const { button } = await setupToolbar("Align text left");
  await pressKey("Enter");
  await expect.element(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Align text center", async () => {
  await openEditor(toolbarDocument);
  const { button } = await setupToolbar("Align text center");
  await pressKey("Enter");
  await expect.element(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Align text right", async () => {
  await openEditor(toolbarDocument);
  const { button } = await setupToolbar("Align text right");
  await pressKey("Enter");
  await expect.element(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Colors", async () => {
  await openEditor(toolbarDocument);
  const { toolbar } = await setupToolbar("Colors");
  await pressKey("Enter");
  await expect.element(page.getByRole("menu")).toBeVisible();
  await pressKey("Escape");
  await expect.element(toolbar).not.toBeInTheDocument();
  await expect.element(page.getByRole("textbox")).toHaveFocus();
});

test("formatting toolbar: Nest block", async () => {
  await openEditor([
    { id: "preceding", type: "paragraph", content: "Preceding paragraph" },
    { id: "format", type: "paragraph", content: "Format this text" },
  ]);
  await setupToolbar("Nest block");
  await pressKey("Enter");
  await expect
    .element(
      document.querySelector<HTMLElement>(
        '[data-node-type="blockContainer"][data-id="preceding"] [data-node-type="blockContainer"][data-id="format"]',
      ),
    )
    .toBeInTheDocument();
  await expect
    .element(
      document.querySelector<HTMLElement>(
        '[data-node-type="blockContainer"][data-id="format"]',
      ),
    )
    .toBeInTheDocument();
});

test("formatting toolbar: Unnest block", async () => {
  await openEditor([
    {
      id: "preceding",
      type: "paragraph",
      content: "Preceding paragraph",
      children: [
        { id: "format", type: "paragraph", content: "Format this text" },
      ],
    },
  ]);
  await setupToolbar("Unnest block");
  await pressKey("Enter");
  await expect
    .element(
      document.querySelector<HTMLElement>(
        '[data-node-type="blockContainer"][data-id="preceding"] [data-node-type="blockContainer"][data-id="format"]',
      ),
    )
    .not.toBeInTheDocument();
  await expect
    .element(
      document.querySelector<HTMLElement>(
        '[data-node-type="blockContainer"][data-id="format"]',
      ),
    )
    .toBeInTheDocument();
});

test("formatting toolbar: Create link", async () => {
  await openEditor(toolbarDocument);
  await setupToolbar("Create link");
  await pressKey("Enter");
  const popover = page.elementLocator(
    document.querySelector<HTMLElement>(".bn-form-popover")!,
  );
  await expect.element(popover.getByPlaceholder("Edit URL")).toHaveFocus();
  if (!screenReader) {
    // TODO: The focused URL input currently has no distinct focus outline.
    // This records its appearance; it does not establish sufficient focus styling.
    await expect
      .element(popover)
      .toMatchScreenshot("focus-create-link-url.png", {});
  }
  await pressKey("Escape");
});
