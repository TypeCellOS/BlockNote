import type { PartialBlock } from "@blocknote/core";
import {
  expect,
  test,
  type Page,
  type ScreenReaderPlaywright,
} from "../../../../../tests/a11y/test.js";
import {
  openEditor,
  checkAxe,
  pressKey,
  readSelection,
  saveTranscript,
  selectToLineEndKey,
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

test.afterEach(async ({ screenReader }) => {
  await saveTranscript(screenReader);
});

// Each test supplies its document before this keyboard-only toolbar setup.
// Setup stops before activation so each test owns its action and assertions.
async function setupToolbar(
  page: Page,
  screenReader: ScreenReaderPlaywright | undefined,
  control: string,
) {
  await pressKey(page, "Tab", screenReader);
  await expect(page.locator(".bn-editor")).toBeFocused();
  await pressKey(page, "ArrowDown", screenReader);
  await pressKey(page, selectToLineEndKey, screenReader);
  await expect
    .poll(async () => (await readSelection(page)).text)
    .toBe("Format this text");
  const toolbar = page.getByRole("toolbar");
  await expect(toolbar).toBeVisible();
  await checkAxe(page);
  await expect(toolbar.getByRole("button")).toHaveCount(12);

  const button = toolbar.getByRole("button", { name: control, exact: true });
  await expect(button).toBeEnabled();
  // Bound traversal to report unreachable controls without looping forever.
  for (let step = 0; step < 15; step++) {
    if (
      await button.evaluate((element) => element === document.activeElement)
    ) {
      break;
    }
    await pressKey(page, "Tab", screenReader);
  }
  await expect(button, `${control} is reachable with Tab`).toBeFocused();
  if (test.info().project.name === "chromium-linux") {
    // Compare the toolbar while the control still has keyboard focus, before
    // Enter can move focus back to the editor. Native screen-reader runs keep
    // their diagnostic screenshots but do not write platform-specific baselines.
    await expect(toolbar).toHaveScreenshot(
      `focus-${control.toLowerCase().replaceAll(" ", "-")}.png`,
      { animations: "disabled" },
    );
  }
  return { toolbar, button };
}

test("formatting toolbar: Paragraph", async ({ page, screenReader }) => {
  await openEditor(page, toolbarDocument, screenReader);
  const { toolbar } = await setupToolbar(page, screenReader, "Paragraph");
  await pressKey(page, "Enter", screenReader);
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await pressKey(page, "ArrowDown", screenReader);
  await pressKey(page, "Home", screenReader);
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  if (test.info().project.name === "chromium-linux") {
    await expect(menu).toHaveScreenshot("focus-block-type-menu-item.png", {
      animations: "disabled",
    });
  }
  await pressKey(page, "Escape", screenReader);
  await expect(toolbar).toHaveCount(0);
  await expect(page.locator(".bn-editor")).toBeFocused();
});

test("formatting toolbar: Bold", async ({ page, screenReader }) => {
  await openEditor(page, toolbarDocument, screenReader);
  const { button } = await setupToolbar(page, screenReader, "Bold");
  await pressKey(page, "Enter", screenReader);
  await expect(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Italic", async ({ page, screenReader }) => {
  await openEditor(page, toolbarDocument, screenReader);
  const { button } = await setupToolbar(page, screenReader, "Italic");
  await pressKey(page, "Enter", screenReader);
  await expect(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Underline", async ({ page, screenReader }) => {
  await openEditor(page, toolbarDocument, screenReader);
  const { button } = await setupToolbar(page, screenReader, "Underline");
  await pressKey(page, "Enter", screenReader);
  await expect(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Strike", async ({ page, screenReader }) => {
  await openEditor(page, toolbarDocument, screenReader);
  const { button } = await setupToolbar(page, screenReader, "Strike");
  await pressKey(page, "Enter", screenReader);
  await expect(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Align text left", async ({ page, screenReader }) => {
  await openEditor(page, toolbarDocument, screenReader);
  const { button } = await setupToolbar(page, screenReader, "Align text left");
  await pressKey(page, "Enter", screenReader);
  await expect(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Align text center", async ({
  page,
  screenReader,
}) => {
  await openEditor(page, toolbarDocument, screenReader);
  const { button } = await setupToolbar(
    page,
    screenReader,
    "Align text center",
  );
  await pressKey(page, "Enter", screenReader);
  await expect(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Align text right", async ({ page, screenReader }) => {
  await openEditor(page, toolbarDocument, screenReader);
  const { button } = await setupToolbar(page, screenReader, "Align text right");
  await pressKey(page, "Enter", screenReader);
  await expect(button).toHaveAttribute("aria-pressed", "true");
});

test("formatting toolbar: Colors", async ({ page, screenReader }) => {
  await openEditor(page, toolbarDocument, screenReader);
  const { toolbar } = await setupToolbar(page, screenReader, "Colors");
  await pressKey(page, "Enter", screenReader);
  await expect(page.getByRole("menu")).toBeVisible();
  await pressKey(page, "Escape", screenReader);
  await expect(toolbar).toHaveCount(0);
  await expect(page.locator(".bn-editor")).toBeFocused();
});

test("formatting toolbar: Nest block", async ({ page, screenReader }) => {
  await openEditor(
    page,
    [
      { id: "preceding", type: "paragraph", content: "Preceding paragraph" },
      { id: "format", type: "paragraph", content: "Format this text" },
    ],
    screenReader,
  );
  await setupToolbar(page, screenReader, "Nest block");
  await pressKey(page, "Enter", screenReader);
  await expect(
    page.locator(
      '[data-node-type="blockContainer"][data-id="preceding"] [data-node-type="blockContainer"][data-id="format"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-node-type="blockContainer"][data-id="format"]'),
  ).toHaveCount(1);
});

test("formatting toolbar: Unnest block", async ({ page, screenReader }) => {
  await openEditor(
    page,
    [
      {
        id: "preceding",
        type: "paragraph",
        content: "Preceding paragraph",
        children: [
          { id: "format", type: "paragraph", content: "Format this text" },
        ],
      },
    ],
    screenReader,
  );
  await setupToolbar(page, screenReader, "Unnest block");
  await pressKey(page, "Enter", screenReader);
  await expect(
    page.locator(
      '[data-node-type="blockContainer"][data-id="preceding"] [data-node-type="blockContainer"][data-id="format"]',
    ),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-node-type="blockContainer"][data-id="format"]'),
  ).toHaveCount(1);
});

test("formatting toolbar: Create link", async ({ page, screenReader }) => {
  await openEditor(page, toolbarDocument, screenReader);
  await setupToolbar(page, screenReader, "Create link");
  await pressKey(page, "Enter", screenReader);
  const popover = page.locator(".bn-form-popover");
  await expect(popover.getByPlaceholder("Edit URL")).toBeFocused();
  if (test.info().project.name === "chromium-linux") {
    // TODO: The focused URL input currently has no distinct focus outline.
    // This records its appearance; it does not establish sufficient focus styling.
    await expect(popover).toHaveScreenshot("focus-create-link-url.png", {
      animations: "disabled",
    });
  }
  await pressKey(page, "Escape", screenReader);
});
