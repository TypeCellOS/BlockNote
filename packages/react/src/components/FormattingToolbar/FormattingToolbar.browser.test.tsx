import { describe, expect } from "vite-plus/test";
import { BasicTextStyleButton } from "./DefaultButtons/BasicTextStyleButton.js";
import { FormattingToolbar } from "./FormattingToolbar.js";

describe("FormattingToolbar", () => {
  describe("unit", () => {
    it("allows custom children instead of default controls", async ({
      renderEditor,
      page,
    }) => {
      await renderEditor({
        props: { formattingToolbar: false },
        children: (
          <FormattingToolbar>
            <button>Custom action</button>
          </FormattingToolbar>
        ),
      });

      const toolbar = page.getByRole("toolbar");
      await expect.element(toolbar.getByRole("button")).toHaveLength(1);
      await expect
        .element(
          toolbar.getByRole("button", { name: "Custom action", exact: true }),
        )
        .toBeVisible();
    });

    it("passes custom block-type choices to its select", async ({
      renderEditor,
      page,
    }) => {
      const { editor } = await renderEditor({
        props: { formattingToolbar: false },
        children: ({ editor }) => (
          <FormattingToolbar
            blockTypeSelectItems={[
              {
                name: editor.dictionary.slash_menu.paragraph.title,
                type: "paragraph",
                icon: () => null,
              },
            ]}
          />
        ),
      });

      await page
        .getByRole("toolbar")
        .getByRole("button", {
          name: editor.dictionary.slash_menu.paragraph.title,
          exact: true,
        })
        .click();

      const menu = page.getByRole("menu");
      await expect.element(menu.getByRole("menuitem")).toHaveLength(1);
      await expect
        .element(
          menu.getByRole("menuitem", {
            name: editor.dictionary.slash_menu.paragraph.title,
            exact: true,
          }),
        )
        .toBeVisible();
    });
  });

  describe("integration", () => {
    it("preserves the editor selection while keyboard focus moves through the toolbar", async ({
      renderEditor,
      selectText,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          { type: "paragraph", content: "Before selected text after" },
        ],
      });
      await page.getByRole("textbox").click();
      selectText(editor, "selected text");
      const toolbar = page.getByRole("toolbar");
      const documentBefore = editor.document;
      const selectionBefore = editor.prosemirrorState.selection.toJSON();

      await commands.pressKey("Tab");

      await expect
        .element(
          toolbar.getByRole("button", {
            name: editor.dictionary.slash_menu.paragraph.title,
            exact: true,
          }),
        )
        .toHaveFocus();
      expect(editor.prosemirrorState.selection.toJSON()).toEqual(
        selectionBefore,
      );

      await commands.pressKey("Tab");

      await expect
        .element(
          toolbar.getByRole("button", {
            name: editor.dictionary.formatting_toolbar.bold.tooltip,
            exact: true,
          }),
        )
        .toHaveFocus();
      expect(editor.prosemirrorState.selection.toJSON()).toEqual(
        selectionBefore,
      );
      expect(editor.document).toEqual(documentBefore);
    });
  });

  describe("keyboard", () => {
    it("provides visible keyboard focus when entering and traversing its controls", async ({
      renderEditor,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        props: { formattingToolbar: false },
        children: (
          <FormattingToolbar>
            <BasicTextStyleButton basicTextStyle="bold" />
            <BasicTextStyleButton basicTextStyle="italic" />
          </FormattingToolbar>
        ),
      });
      await page.getByRole("textbox").click();
      const first = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.bold.tooltip,
        exact: true,
      });
      const second = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.italic.tooltip,
        exact: true,
      });
      const firstOutline = await commands.readOutline(first.selector);
      const secondOutline = await commands.readOutline(second.selector);

      await commands.pressKey("Tab");

      await expect.element(first).toHaveFocus();
      await commands.checkFocusOutline(first.selector, firstOutline);

      await commands.pressKey("Tab");

      await expect.element(second).toHaveFocus();
      await commands.checkFocusOutline(second.selector, secondOutline);
    });
  });

  describe("ARIA", () => {
    it("exposes its custom controls as a toolbar", async ({
      renderEditor,
      commands,
      page,
    }) => {
      await renderEditor({
        props: { formattingToolbar: false },
        children: (
          <FormattingToolbar>
            <button>Custom action</button>
          </FormattingToolbar>
        ),
      });

      expect(
        await commands.readAriaSnapshot(page.getByRole("toolbar").selector),
      ).toMatchInlineSnapshot(`
        "- toolbar:
          - button "Custom action""
      `);
    });
  });

  describe("axe", () => {
    it("has no automated accessibility violations with the default controls", async ({
      renderEditor,
      selectText,
      annotate,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
      });
      selectText(editor, "Selected text");
      await expect.element(page.getByRole("toolbar")).toBeVisible();

      for (const warning of await commands.checkAxe('[role="toolbar"]')) {
        await annotate(warning, "warning");
      }
    });
  });
});
