import { commands } from "@root/tests/src/utils/context.js";
import { selectToLineEndKey } from "@root/tests/src/utils/context.js";
import { type PartialBlock } from "@blocknote/core";
import { expect, test, vi } from "vite-plus/test";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect } from "react";
import { render } from "vitest-browser-react";
import type { BlockNoteEditor } from "@blocknote/core";
import { page, server } from "vite-plus/test/browser";

function TestEditor({
  initialContent,
  onReady,
}: {
  initialContent: PartialBlock[];
  onReady: (editor: BlockNoteEditor) => void;
}) {
  const editor = useCreateBlockNote({ initialContent });
  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);
  return <BlockNoteView editor={editor} theme="light" />;
}

export async function renderTestEditor(initialContent: PartialBlock[]) {
  let editor!: BlockNoteEditor;
  await render(
    <TestEditor
      initialContent={initialContent}
      onReady={(instance) => {
        editor = instance;
      }}
    />,
  );
  await expect.element(page.getByRole("textbox")).toBeVisible();
  await document.fonts.ready;
  editor.focus();
  return editor;
}

const screenReader =
  server.config.name === "voiceover" || server.config.name === "nvda";

// Start with the editor focused after renderTestEditor(). Keep the navigation steps
// identical to focusToolbarItemWithAssertions in the keyboard suite.
export async function focusToolbarItem(toolbarItem: string) {
  await commands.pressKey("ArrowDown");
  await commands.pressKey(selectToLineEndKey);
  const toolbar = page.getByRole("toolbar");
  await commands.pressKey("Tab");
  const target = toolbar.getByRole("button", {
    name: toolbarItem,
    exact: true,
  });
  for (
    let presses = 0;
    document.activeElement !== target.element();
    presses++
  ) {
    if (presses >= 20) {
      throw new Error(
        `Could not focus toolbar item "${toolbarItem}" after 20 Tab presses`,
      );
    }
    await commands.pressKey("Tab");
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
      const editor = await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Bold");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await commands.pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Italic", async ({ onTestFinished }) => {
      const editor = await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Italic");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await commands.pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Underline", async ({ onTestFinished }) => {
      const editor = await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Underline");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await commands.pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Strike", async ({ onTestFinished }) => {
      const editor = await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Strike");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await commands.pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Align text left", async ({ onTestFinished }) => {
      const editor = await renderTestEditor(centeredToolbarDocument);
      await focusToolbarItem("Align text left");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await commands.pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Align text center", async ({
      onTestFinished,
    }) => {
      const editor = await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Align text center");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await commands.pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Align text right", async ({ onTestFinished }) => {
      const editor = await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Align text right");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await commands.pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Colors", async ({ onTestFinished }) => {
      const editor = await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Colors");
      await commands.pressKey("Enter");
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      // Mantine initially focuses a placeholder before the first menu item.
      await expect
        .element(menu.element().querySelector<HTMLElement>("[data-autofocus]"))
        .toHaveFocus();
      await commands.pressKey("ArrowDown");
      await commands.pressKey("ArrowDown");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await commands.pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Nest block", async ({ onTestFinished }) => {
      const editor = await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Nest block");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await commands.pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Unnest block", async ({ onTestFinished }) => {
      const editor = await renderTestEditor(nestedToolbarDocument);
      await focusToolbarItem("Unnest block");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await commands.pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });

    test("formatting toolbar: Paragraph", async ({ onTestFinished }) => {
      const editor = await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Paragraph");
      await commands.pressKey("Enter");
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      // Mantine initially focuses a placeholder before the first menu item.
      await expect
        .element(menu.element().querySelector<HTMLElement>("[data-autofocus]"))
        .toHaveFocus();
      await commands.pressKey("ArrowDown");
      await commands.pressKey("ArrowDown");
      const onChange = vi.fn();
      onTestFinished(editor.onChange(onChange));
      await commands.pressKey("Enter");
      expect(onChange).toHaveBeenCalled();
    });
  });

  test.describe("keyboard", () => {
    // Same navigation as the shared focusToolbarItem, with focus assertions.
    async function focusToolbarItemWithAssertions(toolbarItem: string) {
      const editor = page.getByRole("textbox");
      await expect.element(editor).toHaveFocus();
      await commands.pressKey("ArrowDown");
      await commands.pressKey(selectToLineEndKey);
      const toolbar = page.getByRole("toolbar");
      await expect.element(toolbar).toBeVisible();
      const target = toolbar.getByRole("button", {
        name: toolbarItem,
        exact: true,
      });
      const unfocusedOutline = await commands.readOutline(target.selector);
      await commands.pressKey("Tab");
      await expect
        .poll(() => toolbar.element().contains(document.activeElement))
        .toBe(true);
      for (
        let presses = 0;
        document.activeElement !== target.element();
        presses++
      ) {
        if (presses >= 20) {
          throw new Error(
            `Could not focus toolbar item "${toolbarItem}" after 20 Tab presses`,
          );
        }
        await commands.pressKey("Tab");
      }
      await expect.element(target).toHaveFocus();
      await commands.checkFocusOutline(target.selector, unfocusedOutline);
      return { toolbar, button: target };
    }

    async function checkToolbarButtonKeyboard(toolbarButton: string) {
      await focusToolbarItemWithAssertions(toolbarButton);
      await commands.pressKey("Enter");
      await expect.element(page.getByRole("textbox")).toHaveFocus();
    }

    async function checkToolbarMenuKeyboard(
      toolbarMenu: string,
      item: () => ReturnType<typeof page.getByRole>,
    ) {
      await focusToolbarItemWithAssertions(toolbarMenu);
      await commands.pressKey("Enter");
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      // Mantine initially focuses a placeholder before the first menu item.
      await expect
        .element(menu.element().querySelector<HTMLElement>("[data-autofocus]"))
        .toHaveFocus();
      const firstItem = menu.getByRole("menuitem").first();
      const unfocusedOutline = await commands.readOutline(firstItem.selector);
      await commands.pressKey("ArrowDown");
      await expect.element(firstItem).toHaveFocus();
      await commands.checkFocusOutline(firstItem.selector, unfocusedOutline);
      const targetItem = item();
      const targetUnfocusedOutline = await commands.readOutline(
        targetItem.selector,
      );
      await commands.pressKey("ArrowDown");
      await expect.element(targetItem).toHaveFocus();
      await commands.checkFocusOutline(
        targetItem.selector,
        targetUnfocusedOutline,
      );
      await commands.pressKey("Enter");
      await expect.element(page.getByRole("textbox")).toHaveFocus();
    }

    async function checkToolbarSelectKeyboard(
      toolbarSelect: string,
      selectedValue: string,
    ) {
      await focusToolbarItemWithAssertions(toolbarSelect);
      await commands.pressKey("Enter");
      // Mantine implements the select using a menu and initially focuses a
      // placeholder before the first option.
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      await expect
        .element(menu.element().querySelector<HTMLElement>("[data-autofocus]"))
        .toHaveFocus();
      const firstItem = menu.getByRole("menuitem").first();
      const unfocusedOutline = await commands.readOutline(firstItem.selector);
      await commands.pressKey("ArrowDown");
      await expect.element(firstItem).toHaveFocus();
      await commands.checkFocusOutline(firstItem.selector, unfocusedOutline);
      const targetItem = menu.getByRole("menuitem", {
        name: selectedValue,
        exact: true,
      });
      const targetUnfocusedOutline = await commands.readOutline(
        targetItem.selector,
      );
      await commands.pressKey("ArrowDown");
      await expect.element(targetItem).toHaveFocus();
      await commands.checkFocusOutline(
        targetItem.selector,
        targetUnfocusedOutline,
      );
      await commands.pressKey("Enter");
      // Selects return focus to the trigger, unlike menus, which focus the editor.
      await expect
        .element(page.getByRole("button", { name: selectedValue, exact: true }))
        .toHaveFocus();
    }

    async function checkToolbarPopoverKeyboard(
      toolbarPopover: string,
      input: ReturnType<typeof page.getByRole>,
    ) {
      await focusToolbarItemWithAssertions(toolbarPopover);
      await commands.pressKey("Enter");
      await expect.element(input).toHaveFocus();
      await commands.checkFocusOutline(input.selector);
      await commands.pressKey("Escape");
      await expect.element(input).not.toBeInTheDocument();
      await expect.element(page.getByRole("textbox")).toHaveFocus();
    }

    test("formatting toolbar: Paragraph", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarSelectKeyboard("Paragraph", "Heading 1");
    });

    test("formatting toolbar: Bold", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonKeyboard("Bold");
    });

    test("formatting toolbar: Italic", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonKeyboard("Italic");
    });

    test("formatting toolbar: Underline", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonKeyboard("Underline");
    });

    test("formatting toolbar: Strike", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonKeyboard("Strike");
    });

    test("formatting toolbar: Align text left", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonKeyboard("Align text left");
    });

    test("formatting toolbar: Align text center", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonKeyboard("Align text center");
    });

    test("formatting toolbar: Align text right", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonKeyboard("Align text right");
    });

    test("formatting toolbar: Colors", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarMenuKeyboard("Colors", () =>
        page.elementLocator(
          document.querySelector<HTMLElement>('[data-test="text-color-gray"]')!,
        ),
      );
    });

    test("formatting toolbar: Nest block", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonKeyboard("Nest block");
    });

    test("formatting toolbar: Unnest block", async () => {
      await renderTestEditor(nestedToolbarDocument);
      await checkToolbarButtonKeyboard("Unnest block");
    });

    // The autofocused URL input has outline-style: none in all three browsers.
    // Enable once the input has a visible keyboard focus outline.
    test.skip("formatting toolbar: Create link", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarPopoverKeyboard(
        "Create link",
        page.getByPlaceholder("Edit URL"),
      );
    });
  });

  test.describe("ARIA", () => {
    async function checkToolbarButtonAria(toolbarButton: string) {
      const { button } = await focusToolbarItem(toolbarButton);
      expect(await commands.readAriaSnapshot(button.selector)).toMatchSnapshot(
        "before activation",
      );
      await commands.pressKey("Enter");
      expect(await commands.readAriaSnapshot(button.selector)).toMatchSnapshot(
        "after activation",
      );
    }

    async function checkToolbarMenuAria(
      toolbarMenu: string,
      activatedName: string,
    ) {
      const { toolbar, button } = await focusToolbarItem(toolbarMenu);
      expect(await commands.readAriaSnapshot(button.selector)).toMatchSnapshot(
        "before activation",
      );
      await commands.pressKey("Enter");
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      // Mantine initially focuses a placeholder before the first menu item.
      await expect
        .element(menu.element().querySelector<HTMLElement>("[data-autofocus]"))
        .toHaveFocus();
      await commands.pressKey("ArrowDown");
      await commands.pressKey("ArrowDown");
      await commands.pressKey("Enter");
      expect(
        await commands.readAriaSnapshot(
          toolbar.getByRole("button", { name: activatedName, exact: true })
            .selector,
        ),
      ).toMatchSnapshot("after activation");
    }

    test("formatting toolbar: complete accessibility tree", async () => {
      await renderTestEditor(toolbarDocument);
      const { toolbar } = await focusToolbarItem("Paragraph");
      expect(await commands.readAriaSnapshot(toolbar.selector)).toMatchSnapshot(
        "toolbar",
      );
    });

    test("formatting toolbar: Paragraph", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarMenuAria("Paragraph", "Heading 1");
    });

    test("formatting toolbar: Bold", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonAria("Bold");
    });

    test("formatting toolbar: Italic", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonAria("Italic");
    });

    test("formatting toolbar: Underline", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonAria("Underline");
    });

    test("formatting toolbar: Strike", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonAria("Strike");
    });

    test("formatting toolbar: Align text left", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonAria("Align text left");
    });

    test("formatting toolbar: Align text center", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonAria("Align text center");
    });

    test("formatting toolbar: Align text right", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonAria("Align text right");
    });

    test("formatting toolbar: Colors", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarMenuAria("Colors", "Colors");
    });

    test("formatting toolbar: Nest block", async () => {
      await renderTestEditor(toolbarDocument);
      await checkToolbarButtonAria("Nest block");
    });

    test("formatting toolbar: Unnest block", async () => {
      await renderTestEditor(nestedToolbarDocument);
      await checkToolbarButtonAria("Unnest block");
    });
  });

  test.describe("axe", () => {
    test("formatting toolbar: axe", async ({ annotate }) => {
      await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Paragraph");
      for (const warning of await commands.checkAxe('[role="toolbar"]')) {
        await annotate(warning, "warning");
      }
    });

    // Mantine inserts a focusable div inside the menu, triggering axe aria-required-children violations.
    test.skip("formatting toolbar: block type menu axe", async ({
      annotate,
    }) => {
      await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Paragraph");
      await commands.pressKey("Enter");
      await expect.element(page.getByRole("menu")).toBeVisible();
      for (const warning of await commands.checkAxe('[role="menu"]')) {
        await annotate(warning, "warning");
      }
    });

    // Mantine inserts a focusable div inside the menu, triggering axe aria-required-children violations.
    test.skip("formatting toolbar: colors menu axe", async ({ annotate }) => {
      await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Colors");
      await commands.pressKey("Enter");
      await expect.element(page.getByRole("menu")).toBeVisible();
      for (const warning of await commands.checkAxe('[role="menu"]')) {
        await annotate(warning, "warning");
      }
    });

    test("formatting toolbar: link popover axe", async ({ annotate }) => {
      await renderTestEditor(toolbarDocument);
      await focusToolbarItem("Create link");
      await commands.pressKey("Enter");
      await expect.element(page.getByPlaceholder("Edit URL")).toBeVisible();
      for (const warning of await commands.checkAxe(".bn-form-popover")) {
        await annotate(warning, "warning");
      }
    });
  });
}
