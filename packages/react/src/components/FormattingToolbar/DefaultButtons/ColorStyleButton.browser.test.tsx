import { BlockNoteSchema, defaultStyleSpecs } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";
import { ColorStyleButton } from "./ColorStyleButton.js";

describe("ColorStyleButton", () => {
  describe("unit", () => {
    it("only offers text colors when the schema does not support background colors", async ({
      renderEditor,
      selectText,
      page,
    }) => {
      const { editor } = await renderEditor({
        schema: BlockNoteSchema.create({
          styleSpecs: { textColor: defaultStyleSpecs.textColor },
        }),
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: <ColorStyleButton />,
      });
      selectText(editor, "Selected text");

      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.colors.tooltip,
          exact: true,
        })
        .click();

      const menu = page.getByRole("menu");
      await expect
        .element(
          menu.getByText(editor.dictionary.color_picker.text_title, {
            exact: true,
          }),
        )
        .toBeVisible();
      await expect
        .element(
          menu.getByText(editor.dictionary.color_picker.background_title, {
            exact: true,
          }),
        )
        .not.toBeInTheDocument();
    });

    it("applies the chosen text color only to the selected substring", async ({
      renderEditor,
      selectText,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          { id: "text", type: "paragraph", content: "Before selected after" },
        ],
        props: { formattingToolbar: false },
        children: <ColorStyleButton />,
      });
      selectText(editor, "selected");

      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.colors.tooltip,
        exact: true,
      });
      await button.click();

      await page
        .getByRole("menuitem", {
          name: editor.dictionary.color_picker.colors.gray,
        })
        .first()
        .click();

      expect(editor.getBlock("text")?.content).toEqual([
        { type: "text", text: "Before ", styles: {} },
        { type: "text", text: "selected", styles: { textColor: "gray" } },
        { type: "text", text: " after", styles: {} },
      ]);
      await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
      await expect.element(page.getByRole("textbox")).toHaveFocus();
    });
  });

  describe("keyboard", () => {
    it("supports opening, navigating, and dismissing its menu without editing the document", async ({
      renderEditor,
      selectText,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: <ColorStyleButton />,
      });
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.colors.tooltip,
        exact: true,
      });
      const documentBefore = editor.document;

      button.element().focus();

      await expect.element(button).toHaveFocus();

      await commands.pressKey("Enter");

      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      await expect
        .poll(() => menu.element().contains(document.activeElement))
        .toBe(true);
      const firstItem = menu.getByRole("menuitem").first();
      const outline = await commands.readOutline(firstItem.selector);

      await commands.pressKey("ArrowDown");

      await expect.element(firstItem).toHaveFocus();
      await commands.checkFocusOutline(firstItem.selector, outline);

      await commands.pressKey("Escape");

      await expect.element(menu).not.toBeInTheDocument();
      await expect.element(button).toHaveFocus();
      expect(editor.document).toEqual(documentBefore);
    });
  });

  describe("ARIA", () => {
    // Expected failure in our Mantine adapter (packages/mantine/src/menu/Menu.tsx):
    // it renders `checked` as a visual checkmark without exposing the checked
    // state to assistive technology.
    it.fails("exposes a color change in the trigger or menu's accessibility tree", async ({
      renderEditor,
      selectText,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: <ColorStyleButton />,
      });
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.colors.tooltip,
        exact: true,
      });
      await button.click();
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      const before = [
        await commands.readAriaSnapshot(button.selector),
        await commands.readAriaSnapshot(menu.selector),
      ].join("\n");

      await menu
        .getByRole("menuitem", {
          name: editor.dictionary.color_picker.colors.gray,
        })
        .first()
        .click();
      await expect.element(menu).not.toBeInTheDocument();
      await button.click();

      await expect.element(menu).toBeVisible();
      const after = [
        await commands.readAriaSnapshot(button.selector),
        await commands.readAriaSnapshot(menu.selector),
      ].join("\n");
      expect(after).not.toBe(before);
    });
  });
});
