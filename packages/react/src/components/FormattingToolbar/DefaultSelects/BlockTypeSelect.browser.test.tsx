import { describe, expect } from "vite-plus/test";
import { FormattingToolbar } from "../FormattingToolbar.js";
import { BlockTypeSelect } from "./BlockTypeSelect.js";

describe("BlockTypeSelect", () => {
  describe("unit", () => {
    it("hides when the current block has no offered type and reappears on a supported block", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
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

    it("hides in read-only mode", async ({ setupEditor, page }) => {
      await setupEditor({
        props: { editable: false, formattingToolbar: false },
        children: <BlockTypeSelect />,
      });

      await expect.element(page.getByRole("button")).not.toBeInTheDocument();
    });

    // BlockTypeSelect subscribes to selected blocks, not editability. A change
    // to editable alone does not update the control until selection changes.
    it.fails("reappears when the editor becomes editable without moving selection", async ({
      setupEditor,
      page,
    }) => {
      const { editor, rerender } = await setupEditor({
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
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      setupEditor,
      selectText,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
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

      expect(compareDocuments(documentBefore, editor.document))
        .toMatchInlineSnapshot(`
          "BEFORE:
          <block-selected path="1" type="paragraph">Selected text</block-selected>

          AFTER:
          <block-selected path="1" type="heading" props={"level":1,"isToggleable":false}>Selected text</block-selected>"
        `);
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
      setupEditor,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
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

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-first path="0" type="paragraph">First</block-first>
        <block-second path="1" type="paragraph">Second</block-second>

        AFTER:
        <block-first path="0" type="heading" props={"level":1,"isToggleable":false}>First</block-first>
        <block-second path="1" type="heading" props={"level":1,"isToggleable":false}>Second</block-second>"
      `);
    });
  });

  describe("aria", () => {
    it("names the current block type and exposes the popup relationship", async ({
      setupEditor,
      selectText,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      setupEditor,
      selectText,
      runAxe,
      page,
    }) => {
      const { editor } = await setupEditor({
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

      const { violations } = await runAxe(page.getByRole("toolbar"));
      expect(violations).toEqual([]);
    });

    // Mantine inserts a focusable placeholder div inside the menu. Assert this
    // known violation precisely so additional accessibility failures still fail.
    it("checks the open menu", async ({
      setupEditor,
      selectText,
      runAxe,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      const { violations } = await runAxe(page.getByRole("menu"));
      expect(violations).toMatchObject([
        {
          id: "aria-required-children",
          nodes: [
            {
              any: [
                {
                  id: "aria-required-children",
                  data: { messageKey: "unallowed", values: "div[tabindex]" },
                },
              ],
              all: [],
              none: [],
            },
          ],
        },
      ]);
    });
  });

  describe("keyboard", () => {
    it("shows a keyboard focus ring on its trigger", async ({
      setupEditor,
      selectText,
      captureFocusOutline,
      pressKey,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      const compareFocusOutline = captureFocusOutline(button);

      await pressKey("Tab");

      await expect.element(button).toHaveFocus();
      await compareFocusOutline(button);
    });

    it("dismisses with Escape and restores trigger focus without editing", async ({
      setupEditor,
      selectText,
      pressKey,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      await pressKey("Enter");
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      await expect
        .poll(() => menu.element().contains(document.activeElement))
        .toBe(true);

      await pressKey("Escape");

      await expect.element(menu).not.toBeInTheDocument();
      await expect.element(button).toHaveFocus();
      expect(editor.document).toEqual(before);
      expect(editor.prosemirrorState.selection.toJSON()).toEqual(selection);
    });
    it("opens, navigates, and chooses a block type from the keyboard", async ({
      setupEditor,
      selectText,
      pressKey,
      captureFocusOutline,
      page,
    }) => {
      const { editor } = await setupEditor({
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

      await pressKey("Enter");

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
      const compareFocusOutline = captureFocusOutline(heading);

      await pressKey("ArrowDown");

      await expect.element(paragraph).toHaveFocus();

      await pressKey("ArrowDown");

      await expect.element(heading).toHaveFocus();
      await compareFocusOutline(heading);

      await pressKey("Enter");

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
});
