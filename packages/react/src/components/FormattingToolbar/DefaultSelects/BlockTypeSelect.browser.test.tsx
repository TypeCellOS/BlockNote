import { describe, expect } from "vite-plus/test";
import { FormattingToolbar } from "../FormattingToolbar.js";
import { BlockTypeSelect } from "./BlockTypeSelect.js";

describe("BlockTypeSelect", () => {
  describe("unit", () => {
    it("hides when the current block has no offered type and reappears on a supported block", async ({
      renderEditor,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          { id: "text", type: "paragraph", content: "Text" },
          { id: "divider", type: "divider" },
        ],
        props: { formattingToolbar: false },
        children: <BlockTypeSelect />,
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.slash_menu.paragraph.title,
        exact: true,
      });
      await expect.element(button).toBeVisible();

      editor.setTextCursorPosition("divider");
      await expect.element(page.getByRole("button")).not.toBeInTheDocument();

      editor.setTextCursorPosition("text");
      await expect.element(button).toBeVisible();
    });

    it("hides in read-only mode", async ({ renderEditor, page }) => {
      await renderEditor({
        props: { editable: false, formattingToolbar: false },
        children: <BlockTypeSelect />,
      });

      await expect.element(page.getByRole("button")).not.toBeInTheDocument();
    });

    // BlockTypeSelect subscribes to selected blocks, not editability. A change
    // to editable alone does not update the control until selection changes.
    it.fails("reappears when the editor becomes editable without moving selection", async ({
      renderEditor,
      page,
    }) => {
      const { editor, rerender } = await renderEditor({
        props: { editable: false, formattingToolbar: false },
        children: <BlockTypeSelect />,
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.slash_menu.paragraph.title,
        exact: true,
      });
      await expect.element(button).not.toBeInTheDocument();

      rerender({ editable: true });

      await expect.poll(() => editor.isEditable).toBe(true);
      expect(button.query()).not.toBeNull();
    });
    it("filters custom choices whose block type or property types do not match the schema", async ({
      renderEditor,
      page,
    }) => {
      const { editor } = await renderEditor({
        props: { formattingToolbar: false },
        children: ({ editor }) => (
          <BlockTypeSelect
            items={[
              {
                name: editor.dictionary.slash_menu.paragraph.title,
                type: "paragraph",
                icon: () => null,
              },
              { name: "Unavailable block", type: "missing", icon: () => null },
              {
                name: "Invalid heading",
                type: "heading",
                props: { level: "one" },
                icon: () => null,
              },
            ]}
          />
        ),
      });

      await page
        .getByRole("button", {
          name: editor.dictionary.slash_menu.paragraph.title,
          exact: true,
        })
        .click();

      const items = page.getByRole("menu").getByRole("menuitem");
      await expect.element(items).toHaveLength(1);
      await expect
        .element(items)
        .toHaveTextContent(editor.dictionary.slash_menu.paragraph.title);
    });
  });

  describe("integration", () => {
    it("converts the selected block and updates its label without changing neighboring blocks or text", async ({
      renderEditor,
      selectText,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          { id: "before", type: "paragraph", content: "Before" },
          { id: "selected", type: "paragraph", content: "Selected text" },
          { id: "after", type: "paragraph", content: "After" },
        ],
        props: { formattingToolbar: false },
        children: <BlockTypeSelect />,
      });
      selectText(editor, "Selected text");
      const documentBefore = editor.document;

      await page
        .getByRole("button", {
          name: editor.dictionary.slash_menu.paragraph.title,
          exact: true,
        })
        .click();
      await page
        .getByRole("menuitem", {
          name: editor.dictionary.slash_menu.heading.title,
          exact: true,
        })
        .click();

      expect(editor.document).toEqual([
        documentBefore[0],
        {
          ...documentBefore[1],
          type: "heading",
          props: {
            ...documentBefore[1].props,
            level: 1,
            isToggleable: false,
          },
        },
        documentBefore[2],
      ]);
      await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
      await expect
        .element(
          page.getByRole("button", {
            name: editor.dictionary.slash_menu.heading.title,
            exact: true,
          }),
        )
        .toBeVisible();
    });

    it("converts all selected blocks while leaving an unselected neighbor intact", async ({
      renderEditor,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          { id: "first", type: "paragraph", content: "First" },
          { id: "second", type: "paragraph", content: "Second" },
          { id: "after", type: "paragraph", content: "After" },
        ],
        props: { formattingToolbar: false },
        children: <BlockTypeSelect />,
      });
      editor.setSelection("first", "second");
      const before = editor.document;

      await page
        .getByRole("button", {
          name: editor.dictionary.slash_menu.paragraph.title,
          exact: true,
        })
        .click();
      await page
        .getByRole("menuitem", {
          name: editor.dictionary.slash_menu.heading.title,
          exact: true,
        })
        .click();

      expect(editor.document).toEqual([
        ...before.slice(0, 2).map((block) => ({
          ...block,
          type: "heading",
          props: { ...block.props, level: 1, isToggleable: false },
        })),
        before[2],
      ]);
    });
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
        children: <BlockTypeSelect />,
      });
      await page.getByRole("textbox").click();
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.slash_menu.paragraph.title,
        exact: true,
      });
      const outline = await commands.readOutline(button.selector);

      await commands.pressKey("Tab");

      await expect.element(button).toHaveFocus();
      await commands.checkFocusOutline(button.selector, outline);
    });

    it("dismisses with Escape and restores trigger focus without editing", async ({
      renderEditor,
      selectText,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: <BlockTypeSelect />,
      });
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.slash_menu.paragraph.title,
        exact: true,
      });
      const before = editor.document;
      const selection = editor.prosemirrorState.selection.toJSON();
      button.element().focus();
      await commands.pressKey("Enter");
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      await expect
        .poll(() => menu.element().contains(document.activeElement))
        .toBe(true);

      await commands.pressKey("Escape");

      await expect.element(menu).not.toBeInTheDocument();
      await expect.element(button).toHaveFocus();
      expect(editor.document).toEqual(before);
      expect(editor.prosemirrorState.selection.toJSON()).toEqual(selection);
    });
    it("opens, navigates, and chooses a block type from the keyboard", async ({
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
        children: <BlockTypeSelect />,
      });
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.slash_menu.paragraph.title,
        exact: true,
      });
      button.element().focus();
      await expect.element(button).toHaveFocus();

      await commands.pressKey("Enter");

      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      await expect
        .poll(() => menu.element().contains(document.activeElement))
        .toBe(true);
      const paragraph = menu.getByRole("menuitem", {
        name: editor.dictionary.slash_menu.paragraph.title,
        exact: true,
      });
      const heading = menu.getByRole("menuitem", {
        name: editor.dictionary.slash_menu.heading.title,
        exact: true,
      });
      const outline = await commands.readOutline(heading.selector);

      await commands.pressKey("ArrowDown");

      await expect.element(paragraph).toHaveFocus();

      await commands.pressKey("ArrowDown");

      await expect.element(heading).toHaveFocus();
      await commands.checkFocusOutline(heading.selector, outline);

      await commands.pressKey("Enter");

      await expect.element(menu).not.toBeInTheDocument();
      await expect
        .element(
          page.getByRole("button", {
            name: editor.dictionary.slash_menu.heading.title,
            exact: true,
          }),
        )
        .toHaveFocus();
      expect(editor.getBlock("text")?.type).toBe("heading");
    });
  });

  describe("ARIA", () => {
    it("names the current block type and exposes the popup relationship", async ({
      renderEditor,
      selectText,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          { type: "paragraph", content: "Paragraph text" },
          { type: "heading", props: { level: 2 }, content: "Heading text" },
        ],
        props: { formattingToolbar: false },
        children: <BlockTypeSelect />,
      });
      selectText(editor, "Paragraph text");
      const paragraph = page.getByRole("button", {
        name: editor.dictionary.slash_menu.paragraph.title,
        exact: true,
      });
      await expect.element(paragraph).toBeVisible();

      selectText(editor, "Heading text");

      const heading = page.getByRole("button", {
        name: editor.dictionary.slash_menu.heading_2.title,
        exact: true,
      });
      await expect.element(heading).toBeVisible();
      await expect.element(paragraph).not.toBeInTheDocument();
      await expect.element(heading).toHaveAttribute("aria-haspopup", "menu");
      await expect.element(heading).toHaveAttribute("aria-expanded", "false");

      await heading.click();

      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      await expect.element(heading).toHaveAttribute("aria-expanded", "true");
      expect(heading.element().getAttribute("aria-controls")).toBe(
        menu.element().id,
      );
    });

    // Our Mantine ToolbarSelect renders the selected option as a checkmark
    // only; it does not expose its checked state to assistive technology.
    it.fails("exposes the current menu choice as checked", async ({
      renderEditor,
      page,
    }) => {
      const { editor } = await renderEditor({
        props: { formattingToolbar: false },
        children: <BlockTypeSelect />,
      });
      const name = editor.dictionary.slash_menu.paragraph.title;
      await page.getByRole("button", { name, exact: true }).click();

      const item = page.getByRole("menuitem", { name, exact: true });
      await expect.element(item).toBeVisible();
      expect(item.element().getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("axe", () => {
    it("checks the trigger", async ({
      renderEditor,
      selectText,
      commands,
      page,
      annotate,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: (
          <FormattingToolbar>
            <BlockTypeSelect />
          </FormattingToolbar>
        ),
      });
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.slash_menu.paragraph.title,
        exact: true,
      });
      await expect.element(button).toBeVisible();

      for (const warning of await commands.checkAxe('[role="toolbar"]')) {
        await annotate(warning, "warning");
      }
    });

    // Expected failure: Mantine inserts a focusable placeholder div inside the
    // menu, violating aria-required-children.
    it.fails("checks the open menu", async ({
      renderEditor,
      selectText,
      commands,
      page,
      annotate,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: (
          <FormattingToolbar>
            <BlockTypeSelect />
          </FormattingToolbar>
        ),
      });
      selectText(editor, "Selected text");

      await page
        .getByRole("button", {
          name: editor.dictionary.slash_menu.paragraph.title,
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
