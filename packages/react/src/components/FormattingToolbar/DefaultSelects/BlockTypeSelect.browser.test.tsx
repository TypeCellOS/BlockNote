import { describe, expect } from "vite-plus/test";
import { FormattingToolbar } from "../FormattingToolbar.js";
import { BlockTypeSelect } from "./BlockTypeSelect.js";

describe("BlockTypeSelect", () => {
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

  describe("keyboard", () => {
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
