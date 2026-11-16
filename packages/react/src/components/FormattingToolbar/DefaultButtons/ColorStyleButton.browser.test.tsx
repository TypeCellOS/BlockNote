import { BlockNoteSchema, defaultStyleSpecs } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";
import { ColorStyleButton } from "./ColorStyleButton.js";
import { FormattingToolbar } from "../FormattingToolbar.js";

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

    it("only offers background colors when text colors are not in the schema", async ({
      renderEditor,
      selectText,
      page,
    }) => {
      const { editor } = await renderEditor({
        schema: BlockNoteSchema.create({
          styleSpecs: { backgroundColor: defaultStyleSpecs.backgroundColor },
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
          menu.getByText(editor.dictionary.color_picker.background_title, {
            exact: true,
          }),
        )
        .toBeVisible();
      await expect
        .element(
          menu.getByText(editor.dictionary.color_picker.text_title, {
            exact: true,
          }),
        )
        .not.toBeInTheDocument();
    });

    it("hides when neither color style is supported", async ({
      renderEditor,
      page,
    }) => {
      const { editor } = await renderEditor({
        schema: BlockNoteSchema.create({
          styleSpecs: { bold: defaultStyleSpecs.bold },
        }),
        props: { formattingToolbar: false },
        children: <ColorStyleButton />,
      });

      await expect
        .element(
          page.getByRole("button", {
            name: editor.dictionary.formatting_toolbar.colors.tooltip,
            exact: true,
          }),
        )
        .not.toBeInTheDocument();
    });

    it("responds to editability and hides on blocks without inline content", async ({
      renderEditor,
      page,
    }) => {
      const { editor, rerender } = await renderEditor({
        initialContent: [
          { id: "text", type: "paragraph", content: "Text" },
          { id: "divider", type: "divider" },
        ],
        props: { editable: false, formattingToolbar: false },
        children: <ColorStyleButton />,
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.colors.tooltip,
        exact: true,
      });
      await expect.element(button).not.toBeInTheDocument();

      rerender({ editable: true });
      await expect.element(button).toBeVisible();

      editor.setTextCursorPosition("divider");
      await expect.element(button).not.toBeInTheDocument();

      editor.setTextCursorPosition("text");
      await expect.element(button).toBeVisible();
    });
  });

  describe("integration", () => {
    it.for(["textColor", "backgroundColor"] as const)(
      "applies %s only to the selected substring",
      async (style, { renderEditor, selectText, page }) => {
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
          .nth(style === "textColor" ? 0 : 1)
          .click();

        expect(editor.getBlock("text")?.content).toEqual([
          { type: "text", text: "Before ", styles: {} },
          { type: "text", text: "selected", styles: { [style]: "gray" } },
          { type: "text", text: " after", styles: {} },
        ]);
        await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
        await expect.element(page.getByRole("textbox")).toHaveFocus();
      },
    );

    it.for(["textColor", "backgroundColor"] as const)(
      "resets %s without removing the other color",
      async (style, { renderEditor, selectText, page }) => {
        const { editor } = await renderEditor({
          initialContent: [
            {
              id: "text",
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Selected text",
                  styles: { textColor: "gray", backgroundColor: "gray" },
                },
              ],
            },
          ],
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
        await page
          .getByRole("menuitem", {
            name: editor.dictionary.color_picker.colors.default,
          })
          .nth(style === "textColor" ? 0 : 1)
          .click();

        expect(editor.getBlock("text")?.content).toEqual([
          {
            type: "text",
            text: "Selected text",
            styles:
              style === "textColor"
                ? { backgroundColor: "gray" }
                : { textColor: "gray" },
          },
        ]);
      },
    );
  });

  describe("keyboard", () => {
    it("shows a keyboard focus ring on its trigger", async ({
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
      await page.getByRole("textbox").click();
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.colors.tooltip,
        exact: true,
      });
      const outline = await commands.readOutline(button.selector);

      await commands.pressKey("Tab");

      await expect.element(button).toHaveFocus();
      await commands.checkFocusOutline(button.selector, outline);
    });

    it("chooses a color with the keyboard and returns focus to the editor", async ({
      renderEditor,
      selectText,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          { id: "text", type: "paragraph", content: "Selected text" },
        ],
        props: { formattingToolbar: false },
        children: <ColorStyleButton />,
      });
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.colors.tooltip,
        exact: true,
      });
      button.element().focus();

      await commands.pressKey("Enter");
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      await expect
        .poll(() => menu.element().contains(document.activeElement))
        .toBe(true);
      await commands.pressKey("ArrowDown");
      await commands.pressKey("ArrowDown");

      await expect
        .element(
          menu
            .getByRole("menuitem", {
              name: editor.dictionary.color_picker.colors.gray,
            })
            .first(),
        )
        .toHaveFocus();

      await commands.pressKey("Enter");

      await expect.element(menu).not.toBeInTheDocument();
      await expect.element(page.getByRole("textbox")).toHaveFocus();
      expect(editor.getActiveStyles().textColor).toBe("gray");
    });
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
    it("exposes the menu trigger's expanded state and relationship", async ({
      renderEditor,
      selectText,
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
      await expect.element(button).toHaveAttribute("aria-haspopup", "menu");
      await expect.element(button).toHaveAttribute("aria-expanded", "false");

      await button.click();

      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      await expect.element(button).toHaveAttribute("aria-expanded", "true");
      expect(button.element().getAttribute("aria-controls")).toBe(
        menu.element().id,
      );
    });
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

  describe("axe", () => {
    it("checks the color trigger", async ({
      renderEditor,
      commands,
      annotate,
    }) => {
      await renderEditor({
        props: { formattingToolbar: false },
        children: (
          <FormattingToolbar>
            <ColorStyleButton />
          </FormattingToolbar>
        ),
      });

      for (const warning of await commands.checkAxe('[role="toolbar"]')) {
        await annotate(warning, "warning");
      }
    });

    // Mantine's focusable menu placeholder violates aria-required-children,
    // as it does in BlockTypeSelect. Keep the open state covered explicitly.
    it.fails("checks the open color menu", async ({
      renderEditor,
      commands,
      page,
      annotate,
    }) => {
      const { editor } = await renderEditor({
        props: { formattingToolbar: false },
        children: (
          <FormattingToolbar>
            <ColorStyleButton />
          </FormattingToolbar>
        ),
      });
      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.colors.tooltip,
          exact: true,
        })
        .click();
      await expect.element(page.getByRole("menu")).toBeVisible();

      for (const warning of await commands.checkAxe('[role="menu"]')) {
        await annotate(warning, "warning");
      }
    });
  });
});
