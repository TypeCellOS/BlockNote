import { type PartialBlock } from "@blocknote/core";
import { expect, test, vi } from "vite-plus/test";
import {
  openEditor,
  screenReader,
  pressKey,
  checkAriaSnapshot,
  checkAxe,
  readOutline,
  checkFocusOutline,
  selectToLineEndKey,
} from "@root/tests/a11y/helpers.js";
import { page } from "vite-plus/test/browser";

// Start from "Before editor" after openEditor(). Keep the navigation steps
// identical to focusToolbarItemWithAssertions in the keyboard suite.
export async function focusToolbarItem(toolbarItem: string) {
  await pressKey("Tab");
  await pressKey("ArrowDown");
  await pressKey(selectToLineEndKey);
  const toolbar = page.getByRole("toolbar");
  await pressKey("Tab");
  const target = toolbar.getByRole("button", {
    name: toolbarItem,
    exact: true,
  });
  while (document.activeElement !== target.element()) {
    await pressKey("Tab");
  }
  return { toolbar, button: target };
}

// The middle paragraph is selected; its neighbours provide navigation context.
export const toolbarDocument: PartialBlock[] = [
  { id: "preceding", type: "paragraph", content: "Preceding paragraph" },
  { id: "format", type: "paragraph", content: "Format this text" },
  { id: "following", type: "paragraph", content: "Following paragraph" },
];

const nestedToolbarDocument: PartialBlock[] = [
  {
    id: "preceding",
    type: "paragraph",
    content: "Preceding paragraph",
    children: [
      { id: "format", type: "paragraph", content: "Format this text" },
    ],
  },
];

// Left alignment must change the selected paragraph rather than reapply its default.
const centeredToolbarDocument: PartialBlock[] = [
  { id: "preceding", type: "paragraph", content: "Preceding paragraph" },
  {
    id: "format",
    type: "paragraph",
    props: { textAlignment: "center" },
    content: "Format this text",
  },
  { id: "following", type: "paragraph", content: "Following paragraph" },
];

// Screen-reader tests import the shared helpers and fixtures from this file.
// Register these suites only in the regular browser run.
if (!screenReader) {
  test.describe("behavior", () => {
    test("formatting toolbar: Bold", async ({ onTestFinished }) => {
      const editor = await openEditor(toolbarDocument);
      await focusToolbarItem("Bold");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Italic", async ({ onTestFinished }) => {
      const editor = await openEditor(toolbarDocument);
      await focusToolbarItem("Italic");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Underline", async ({ onTestFinished }) => {
      const editor = await openEditor(toolbarDocument);
      await focusToolbarItem("Underline");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Strike", async ({ onTestFinished }) => {
      const editor = await openEditor(toolbarDocument);
      await focusToolbarItem("Strike");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Align text left", async ({ onTestFinished }) => {
      const editor = await openEditor(centeredToolbarDocument);
      await focusToolbarItem("Align text left");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Align text center", async ({
      onTestFinished,
    }) => {
      const editor = await openEditor(toolbarDocument);
      await focusToolbarItem("Align text center");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Align text right", async ({ onTestFinished }) => {
      const editor = await openEditor(toolbarDocument);
      await focusToolbarItem("Align text right");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Colors", async ({ onTestFinished }) => {
      const editor = await openEditor(toolbarDocument);
      await focusToolbarItem("Colors");
      await pressKey("Enter");
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      // Mantine initially focuses a placeholder before the first menu item.
      await expect
        .element(menu.element().querySelector<HTMLElement>("[data-autofocus]"))
        .toHaveFocus();
      await pressKey("ArrowDown");
      await pressKey("ArrowDown");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Nest block", async ({ onTestFinished }) => {
      const editor = await openEditor(toolbarDocument);
      await focusToolbarItem("Nest block");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Unnest block", async ({ onTestFinished }) => {
      const editor = await openEditor(nestedToolbarDocument);
      await focusToolbarItem("Unnest block");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Paragraph", async ({ onTestFinished }) => {
      const editor = await openEditor(toolbarDocument);
      await focusToolbarItem("Paragraph");
      await pressKey("Enter");
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      // Mantine initially focuses a placeholder before the first menu item.
      await expect
        .element(menu.element().querySelector<HTMLElement>("[data-autofocus]"))
        .toHaveFocus();
      await pressKey("ArrowDown");
      await pressKey("ArrowDown");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });
  });

  test.describe("keyboard", () => {
    // Same navigation as the shared focusToolbarItem, with focus assertions.
    async function focusToolbarItemWithAssertions(toolbarItem: string) {
      await pressKey("Tab");
      const editor = page.getByRole("textbox");
      await expect.element(editor).toHaveFocus();
      await pressKey("ArrowDown");
      await pressKey(selectToLineEndKey);
      const toolbar = page.getByRole("toolbar");
      await expect.element(toolbar).toBeVisible();
      const target = toolbar.getByRole("button", {
        name: toolbarItem,
        exact: true,
      });
      const unfocusedOutline = readOutline(target.element());
      await pressKey("Tab");
      await expect
        .poll(() => toolbar.element().contains(document.activeElement))
        .toBe(true);
      while (document.activeElement !== target.element()) {
        await pressKey("Tab");
      }
      await expect.element(target).toHaveFocus();
      await checkFocusOutline(target, unfocusedOutline);
      return { toolbar, button: target };
    }

    async function checkToolbarButtonKeyboard(toolbarButton: string) {
      await focusToolbarItemWithAssertions(toolbarButton);
      await pressKey("Enter");
      await expect.element(page.getByRole("textbox")).toHaveFocus();
    }

    async function checkToolbarMenuKeyboard(
      toolbarMenu: string,
      item: () => ReturnType<typeof page.getByRole>,
    ) {
      await focusToolbarItemWithAssertions(toolbarMenu);
      await pressKey("Enter");
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      // Mantine initially focuses a placeholder before the first menu item.
      await expect
        .element(menu.element().querySelector<HTMLElement>("[data-autofocus]"))
        .toHaveFocus();
      const firstItem = menu.getByRole("menuitem").first();
      const unfocusedOutline = readOutline(firstItem.element());
      await pressKey("ArrowDown");
      await expect.element(firstItem).toHaveFocus();
      await checkFocusOutline(firstItem, unfocusedOutline);
      const targetItem = item();
      const targetUnfocusedOutline = readOutline(targetItem.element());
      await pressKey("ArrowDown");
      await expect.element(targetItem).toHaveFocus();
      await checkFocusOutline(targetItem, targetUnfocusedOutline);
      await pressKey("Enter");
      await expect.element(page.getByRole("textbox")).toHaveFocus();
    }

    async function checkToolbarPopoverKeyboard(
      toolbarPopover: string,
      input: ReturnType<typeof page.getByRole>,
    ) {
      await focusToolbarItemWithAssertions(toolbarPopover);
      await pressKey("Enter");
      await expect.element(input).toHaveFocus();
      await checkFocusOutline(input);
      await pressKey("Escape");
      await expect.element(input).not.toBeInTheDocument();
      await expect.element(page.getByRole("textbox")).toHaveFocus();
    }

    test("formatting toolbar: Paragraph", async () => {
      await openEditor(toolbarDocument);
      await checkToolbarMenuKeyboard("Paragraph", () =>
        page.getByRole("menuitem", { name: "Heading 1", exact: true }),
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

    // The autofocused URL input has outline-style: none in all three browsers.
    // Enable once the input has a visible keyboard focus outline.
    test.skip("formatting toolbar: Create link", async () => {
      await openEditor(toolbarDocument);
      await checkToolbarPopoverKeyboard(
        "Create link",
        page.getByPlaceholder("Edit URL"),
      );
    });
  });

  test.describe("ARIA", () => {
    async function checkToolbarButtonAria(toolbarButton: string) {
      const { button } = await focusToolbarItem(toolbarButton);
      await checkAriaSnapshot(button, "before activation");
      await pressKey("Enter");
      await checkAriaSnapshot(button, "after activation");
    }

    async function checkToolbarMenuAria(
      toolbarMenu: string,
      activatedName: string,
    ) {
      const { toolbar, button } = await focusToolbarItem(toolbarMenu);
      await checkAriaSnapshot(button, "before activation");
      await pressKey("Enter");
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      // Mantine initially focuses a placeholder before the first menu item.
      await expect
        .element(menu.element().querySelector<HTMLElement>("[data-autofocus]"))
        .toHaveFocus();
      await pressKey("ArrowDown");
      await pressKey("ArrowDown");
      await pressKey("Enter");
      await checkAriaSnapshot(
        toolbar.getByRole("button", { name: activatedName, exact: true }),
        "after activation",
      );
    }

    test("formatting toolbar: complete accessibility tree", async () => {
      await openEditor(toolbarDocument);
      const { toolbar } = await focusToolbarItem("Paragraph");
      await checkAriaSnapshot(toolbar, "toolbar");
    });

    test("formatting toolbar: Paragraph", async () => {
      await openEditor(toolbarDocument);
      await checkToolbarMenuAria("Paragraph", "Heading 1");
    });

    test("formatting toolbar: Bold", async () => {
      await openEditor(toolbarDocument);
      await checkToolbarButtonAria("Bold");
    });

    test("formatting toolbar: Italic", async () => {
      await openEditor(toolbarDocument);
      await checkToolbarButtonAria("Italic");
    });

    test("formatting toolbar: Underline", async () => {
      await openEditor(toolbarDocument);
      await checkToolbarButtonAria("Underline");
    });

    test("formatting toolbar: Strike", async () => {
      await openEditor(toolbarDocument);
      await checkToolbarButtonAria("Strike");
    });

    test("formatting toolbar: Align text left", async () => {
      await openEditor(toolbarDocument);
      await checkToolbarButtonAria("Align text left");
    });

    test("formatting toolbar: Align text center", async () => {
      await openEditor(toolbarDocument);
      await checkToolbarButtonAria("Align text center");
    });

    test("formatting toolbar: Align text right", async () => {
      await openEditor(toolbarDocument);
      await checkToolbarButtonAria("Align text right");
    });

    test("formatting toolbar: Colors", async () => {
      await openEditor(toolbarDocument);
      await checkToolbarMenuAria("Colors", "Colors");
    });

    test("formatting toolbar: Nest block", async () => {
      await openEditor(toolbarDocument);
      await checkToolbarButtonAria("Nest block");
    });

    test("formatting toolbar: Unnest block", async () => {
      await openEditor(nestedToolbarDocument);
      await checkToolbarButtonAria("Unnest block");
    });
  });

  test.describe("axe", () => {
    test("formatting toolbar: axe", async ({ annotate }) => {
      await openEditor(toolbarDocument);
      await focusToolbarItem("Paragraph");
      await checkAxe(annotate, '[role="toolbar"]');
    });

    // Mantine inserts a focusable div inside the menu, triggering axe aria-required-children violations.
    test.skip("formatting toolbar: block type menu axe", async ({
      annotate,
    }) => {
      await openEditor(toolbarDocument);
      await focusToolbarItem("Paragraph");
      await pressKey("Enter");
      await expect.element(page.getByRole("menu")).toBeVisible();
      await checkAxe(annotate, '[role="menu"]');
    });

    // Mantine inserts a focusable div inside the menu, triggering axe aria-required-children violations.
    test.skip("formatting toolbar: colors menu axe", async ({ annotate }) => {
      await openEditor(toolbarDocument);
      await focusToolbarItem("Colors");
      await pressKey("Enter");
      await expect.element(page.getByRole("menu")).toBeVisible();
      await checkAxe(annotate, '[role="menu"]');
    });

    test("formatting toolbar: link popover axe", async ({ annotate }) => {
      await openEditor(toolbarDocument);
      await focusToolbarItem("Create link");
      await pressKey("Enter");
      await expect.element(page.getByPlaceholder("Edit URL")).toBeVisible();
      await checkAxe(annotate, ".bn-form-popover");
    });
  });
}
