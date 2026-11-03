import { toolbarDocument, nestedToolbarDocument } from "./fixtures.js";
import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { openEditor, pressKey } from "@root/tests/a11y/helpers.js";
import {
  activateToolbarButton,
  openToolbarMenu,
  focusNextMenuItem,
  activateMenuItem,
  openToolbarPopover,
  focusEditor,
  openToolbar,
  focusToolbar,
  focusNextToolbarItem,
} from "./helpers.js";

// Same navigation as the shared focusToolbarItem, with focus assertions.
async function focusToolbarItemWithAssertions(toolbarItem: string) {
  const editor = await focusEditor();
  await expect.element(editor).toHaveFocus();
  const toolbar = await openToolbar();
  await expect.element(toolbar).toBeVisible();
  await focusToolbar();
  await expect
    .element(toolbar.getByRole("button", { name: "Paragraph", exact: true }))
    .toHaveFocus();
  const target = toolbar.getByRole("button", {
    name: toolbarItem,
    exact: true,
  });
  while (document.activeElement !== target.element()) {
    await focusNextToolbarItem();
  }
  await expect.element(target).toHaveFocus();
  return { toolbar, button: target };
}

async function checkToolbarItemFocus(toolbarItem: string) {
  const { toolbar } = await focusToolbarItemWithAssertions(toolbarItem);
  await expect
    .element(toolbar)
    .toMatchScreenshot(
      `focus-${toolbarItem.toLowerCase().replaceAll(" ", "-")}.png`,
      {},
    );
}

async function checkToolbarButtonKeyboard(toolbarButton: string) {
  await checkToolbarItemFocus(toolbarButton);
  await activateToolbarButton();
  await expect.element(page.getByRole("textbox")).toHaveFocus();
}

async function checkToolbarMenuKeyboard(
  toolbarMenu: string,
  item: () => ReturnType<typeof page.getByRole>,
  screenshot?: string,
) {
  await checkToolbarItemFocus(toolbarMenu);
  await openToolbarMenu();
  const menu = page.getByRole("menu");
  await expect.element(menu).toBeVisible();
  await focusNextMenuItem();
  await expect.element(menu.getByRole("menuitem").first()).toHaveFocus();
  if (screenshot) {
    await expect.element(menu).toMatchScreenshot(screenshot, {});
  }
  await focusNextMenuItem();
  await expect.element(item()).toHaveFocus();
  await activateMenuItem();
  await expect.element(page.getByRole("textbox")).toHaveFocus();
}

async function checkToolbarPopoverKeyboard(
  toolbarPopover: string,
  input: ReturnType<typeof page.getByRole>,
) {
  await checkToolbarItemFocus(toolbarPopover);
  await openToolbarPopover();
  await expect.element(input).toHaveFocus();
  await pressKey("Escape");
  await expect.element(input).not.toBeInTheDocument();
  await expect.element(page.getByRole("textbox")).toHaveFocus();
}

test("formatting toolbar: Paragraph", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarMenuKeyboard(
    "Paragraph",
    () => page.getByRole("menuitem", { name: "Heading 1", exact: true }),
    "focus-block-type-menu-item.png",
  );
});

test("formatting toolbar: Bold", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonKeyboard("Bold");
});

test("formatting toolbar: Italic", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonKeyboard("Italic");
});

test("formatting toolbar: Underline", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonKeyboard("Underline");
});

test("formatting toolbar: Strike", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonKeyboard("Strike");
});

test("formatting toolbar: Align text left", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonKeyboard("Align text left");
});

test("formatting toolbar: Align text center", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonKeyboard("Align text center");
});

test("formatting toolbar: Align text right", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonKeyboard("Align text right");
});

test("formatting toolbar: Colors", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarMenuKeyboard("Colors", () =>
    page.elementLocator(
      document.querySelector<HTMLElement>('[data-test="text-color-gray"]')!,
    ),
  );
});

test("formatting toolbar: Nest block", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonKeyboard("Nest block");
});

test("formatting toolbar: Unnest block", async () => {
  await openEditor(nestedToolbarDocument);
  await checkToolbarButtonKeyboard("Unnest block");
});

test("formatting toolbar: Create link", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarPopoverKeyboard(
    "Create link",
    page.getByPlaceholder("Edit URL"),
  );
});

test("formatting toolbar: Escape dismisses block type select and returns to the editor", async () => {
  await openEditor(toolbarDocument);
  const { toolbar } = await focusToolbarItemWithAssertions("Paragraph");
  await openToolbarMenu();
  const menu = page.getByRole("menu");
  await expect.element(menu).toBeVisible();
  await focusNextMenuItem();
  await expect.element(menu.getByRole("menuitem").first()).toHaveFocus();
  await pressKey("Escape");
  await expect.element(menu).not.toBeInTheDocument();
  await expect.element(toolbar).not.toBeInTheDocument();
  await expect.element(page.getByRole("textbox")).toHaveFocus();
});
