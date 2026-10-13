import { toolbarDocument, focusToolbarControl } from "./helpers.js";
import { expect, test } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { openEditor, pressKey } from "@root/tests/a11y/helpers.js";

async function setupToolbar(control: string) {
  const result = await focusToolbarControl(control);
  await expect
    .element(result.toolbar)
    .toMatchScreenshot(
      `focus-${control.toLowerCase().replaceAll(" ", "-")}.png`,
      {},
    );
  return result;
}

test("formatting toolbar: Block type select", async () => {
  await openEditor(toolbarDocument);
  await setupToolbar("Paragraph");
  await pressKey("Enter");
  const menu = page.getByRole("menu");
  await expect.element(menu).toBeVisible();
  await pressKey("ArrowDown");
  await expect.element(menu.getByRole("menuitem").first()).toHaveFocus();
  await expect
    .element(menu)
    .toMatchScreenshot("focus-block-type-menu-item.png", {});
  await pressKey("ArrowDown");
  await expect
    .element(menu.getByRole("menuitem", { name: "Heading 1", exact: true }))
    .toHaveFocus();
  await pressKey("Enter");
  await expect
    .element(
      page.getByRole("heading", {
        level: 1,
        name: "Format this text",
        exact: true,
      }),
    )
    .toHaveTextContent("Format this text");
  await expect.element(menu).not.toBeInTheDocument();
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

// Choose gray, verify it is applied to the selected text, and check that
// focus returns to the editor.
test("formatting toolbar: Colors", async () => {
  await openEditor(toolbarDocument);
  await setupToolbar("Colors");
  await pressKey("Enter");
  await expect.element(page.getByRole("menu")).toBeVisible();
  await pressKey("ArrowDown");
  await pressKey("ArrowDown");
  await expect
    .element(
      document.querySelector<HTMLElement>('[data-test="text-color-gray"]'),
    )
    .toHaveFocus();
  await pressKey("Enter");
  await expect
    .element(
      document.querySelector<HTMLElement>(
        '[data-id="format"] [data-style-type="textColor"][data-value="gray"]',
      ),
    )
    .toHaveTextContent("Format this text");
  await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
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

test.skip("formatting toolbar: Create link", async () => {
  await openEditor(toolbarDocument);
  await setupToolbar("Create link");
  await pressKey("Enter");
  const popover = page.elementLocator(
    document.querySelector<HTMLElement>(".bn-form-popover")!,
  );
  await expect.element(popover.getByPlaceholder("Edit URL")).toHaveFocus();
  // TODO: The focused URL input currently has no distinct focus outline.
  await expect
    .element(popover)
    .toMatchScreenshot("focus-create-link-url.png", {});
  await userEvent.keyboard("https://www.blocknotejs.org/");
  await pressKey("Enter");
  await expect
    .element(document.querySelector<HTMLElement>('[data-id="format"] a'))
    .toHaveAttribute("href", "https://www.blocknotejs.org/");
  await expect.element(page.getByRole("textbox")).toHaveFocus();
});

test.skip("read-only formatting toolbar: Tab selects a file block and reaches its actions", async () => {
  // TODO: Open an editor with editable: false and a populated image/file block.
  // Select the block with Tab, verify its formatting toolbar opens, then Tab
  // to the read-only action (e.g. Download file) and activate it with Enter.
  // Verify the resulting file action, focus indicator, and continued Tab
  // navigation to After editor. Editing actions must not be offered.
  // This is blocked by file/media blocks not being selectable with Tab.
  // Keep the setup keyboard-only rather than forcing selection via an API.
});
