import { describe, expect } from "vite-plus/test";
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
    it("tabs forward through the default controls for Parent and allows leaving", async ({
      renderEditor,
      selectText,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          {
            type: "paragraph",
            content: "Parent",
            children: [{ type: "paragraph", content: "Child" }],
          },
          { type: "paragraph", content: "Sibling" },
        ],
        props: { formattingToolbar: false },
        children: <FormattingToolbar />,
      });
      await page.getByRole("textbox").click();
      selectText(editor, "Parent");
      const toolbar = page.getByRole("toolbar");
      await expect.element(toolbar).toBeVisible();
      const sequence: string[] = [];

      await commands.focusUntil(async (active) => {
        if (!toolbar.element().contains(active.element())) {
          return true;
        }
        await expect.element(active).toBeEnabled();
        sequence.push(await commands.readAriaSnapshot(active.selector));
        return false;
      });

      expect(sequence).toMatchInlineSnapshot(`
        [
          "- button "Paragraph":
          - img
          - text: Paragraph",
          "- button "Bold":
          - img",
          "- button "Italic":
          - img",
          "- button "Underline":
          - img",
          "- button "Strike":
          - img",
          "- button "Align text left" [pressed]:
          - img",
          "- button "Align text center":
          - img",
          "- button "Align text right":
          - img",
          "- button "Colors": A",
          "- button "Create link":
          - img",
        ]
      `);
      expect(toolbar.element().contains(document.activeElement)).toBe(false);
    });

    it("tabs forward through the default controls for Child and allows leaving", async ({
      renderEditor,
      selectText,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          {
            type: "paragraph",
            content: "Parent",
            children: [{ type: "paragraph", content: "Child" }],
          },
          { type: "paragraph", content: "Sibling" },
        ],
        props: { formattingToolbar: false },
        children: <FormattingToolbar />,
      });
      await page.getByRole("textbox").click();
      selectText(editor, "Child");
      const toolbar = page.getByRole("toolbar");
      await expect.element(toolbar).toBeVisible();
      const sequence: string[] = [];

      await commands.focusUntil(async (active) => {
        if (!toolbar.element().contains(active.element())) {
          return true;
        }
        await expect.element(active).toBeEnabled();
        sequence.push(await commands.readAriaSnapshot(active.selector));
        return false;
      });

      expect(sequence).toMatchInlineSnapshot(`
        [
          "- button "Paragraph":
          - img
          - text: Paragraph",
          "- button "Bold":
          - img",
          "- button "Italic":
          - img",
          "- button "Underline":
          - img",
          "- button "Strike":
          - img",
          "- button "Align text left" [pressed]:
          - img",
          "- button "Align text center":
          - img",
          "- button "Align text right":
          - img",
          "- button "Colors": A",
          "- button "Unnest block":
          - img",
          "- button "Create link":
          - img",
        ]
      `);
      expect(toolbar.element().contains(document.activeElement)).toBe(false);
    });

    it("tabs forward through the default controls for Sibling and allows leaving", async ({
      renderEditor,
      selectText,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          {
            type: "paragraph",
            content: "Parent",
            children: [{ type: "paragraph", content: "Child" }],
          },
          { type: "paragraph", content: "Sibling" },
        ],
        props: { formattingToolbar: false },
        children: <FormattingToolbar />,
      });
      await page.getByRole("textbox").click();
      selectText(editor, "Sibling");
      const toolbar = page.getByRole("toolbar");
      await expect.element(toolbar).toBeVisible();
      const sequence: string[] = [];

      await commands.focusUntil(async (active) => {
        if (!toolbar.element().contains(active.element())) {
          return true;
        }
        await expect.element(active).toBeEnabled();
        sequence.push(await commands.readAriaSnapshot(active.selector));
        return false;
      });

      expect(sequence).toMatchInlineSnapshot(`
        [
          "- button "Paragraph":
          - img
          - text: Paragraph",
          "- button "Bold":
          - img",
          "- button "Italic":
          - img",
          "- button "Underline":
          - img",
          "- button "Strike":
          - img",
          "- button "Align text left" [pressed]:
          - img",
          "- button "Align text center":
          - img",
          "- button "Align text right":
          - img",
          "- button "Colors": A",
          "- button "Nest block":
          - img",
          "- button "Create link":
          - img",
        ]
      `);
      expect(toolbar.element().contains(document.activeElement)).toBe(false);
    });

    it("tabs backward through the default controls for Parent and allows leaving", async ({
      renderEditor,
      selectText,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          {
            type: "paragraph",
            content: "Parent",
            children: [{ type: "paragraph", content: "Child" }],
          },
          { type: "paragraph", content: "Sibling" },
        ],
        props: { formattingToolbar: false },
        children: <FormattingToolbar />,
      });
      selectText(editor, "Parent");
      const toolbar = page.getByRole("toolbar");
      const lastControl = toolbar.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.link.tooltip,
        exact: true,
      });
      await expect.element(lastControl).toBeVisible();
      lastControl.element().focus();
      const sequence = [await commands.readAriaSnapshot(lastControl.selector)];

      await commands.focusUntil(async (active) => {
        if (!toolbar.element().contains(active.element())) {
          return true;
        }
        await expect.element(active).toBeEnabled();
        sequence.push(await commands.readAriaSnapshot(active.selector));
        return false;
      }, "backward");

      expect(sequence).toMatchInlineSnapshot(`
        [
          "- button "Create link":
          - img",
          "- button "Colors": A",
          "- button "Align text right":
          - img",
          "- button "Align text center":
          - img",
          "- button "Align text left" [pressed]:
          - img",
          "- button "Strike":
          - img",
          "- button "Underline":
          - img",
          "- button "Italic":
          - img",
          "- button "Bold":
          - img",
          "- button "Paragraph":
          - img
          - text: Paragraph",
        ]
      `);
      expect(toolbar.element().contains(document.activeElement)).toBe(false);
    });

    it("tabs backward through the default controls for Child and allows leaving", async ({
      renderEditor,
      selectText,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          {
            type: "paragraph",
            content: "Parent",
            children: [{ type: "paragraph", content: "Child" }],
          },
          { type: "paragraph", content: "Sibling" },
        ],
        props: { formattingToolbar: false },
        children: <FormattingToolbar />,
      });
      selectText(editor, "Child");
      const toolbar = page.getByRole("toolbar");
      const lastControl = toolbar.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.link.tooltip,
        exact: true,
      });
      await expect.element(lastControl).toBeVisible();
      lastControl.element().focus();
      const sequence = [await commands.readAriaSnapshot(lastControl.selector)];

      await commands.focusUntil(async (active) => {
        if (!toolbar.element().contains(active.element())) {
          return true;
        }
        await expect.element(active).toBeEnabled();
        sequence.push(await commands.readAriaSnapshot(active.selector));
        return false;
      }, "backward");

      expect(sequence).toMatchInlineSnapshot(`
        [
          "- button "Create link":
          - img",
          "- button "Unnest block":
          - img",
          "- button "Colors": A",
          "- button "Align text right":
          - img",
          "- button "Align text center":
          - img",
          "- button "Align text left" [pressed]:
          - img",
          "- button "Strike":
          - img",
          "- button "Underline":
          - img",
          "- button "Italic":
          - img",
          "- button "Bold":
          - img",
          "- button "Paragraph":
          - img
          - text: Paragraph",
        ]
      `);
      expect(toolbar.element().contains(document.activeElement)).toBe(false);
    });

    it("tabs backward through the default controls for Sibling and allows leaving", async ({
      renderEditor,
      selectText,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          {
            type: "paragraph",
            content: "Parent",
            children: [{ type: "paragraph", content: "Child" }],
          },
          { type: "paragraph", content: "Sibling" },
        ],
        props: { formattingToolbar: false },
        children: <FormattingToolbar />,
      });
      selectText(editor, "Sibling");
      const toolbar = page.getByRole("toolbar");
      const lastControl = toolbar.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.link.tooltip,
        exact: true,
      });
      await expect.element(lastControl).toBeVisible();
      lastControl.element().focus();
      const sequence = [await commands.readAriaSnapshot(lastControl.selector)];

      await commands.focusUntil(async (active) => {
        if (!toolbar.element().contains(active.element())) {
          return true;
        }
        await expect.element(active).toBeEnabled();
        sequence.push(await commands.readAriaSnapshot(active.selector));
        return false;
      }, "backward");

      expect(sequence).toMatchInlineSnapshot(`
        [
          "- button "Create link":
          - img",
          "- button "Nest block":
          - img",
          "- button "Colors": A",
          "- button "Align text right":
          - img",
          "- button "Align text center":
          - img",
          "- button "Align text left" [pressed]:
          - img",
          "- button "Strike":
          - img",
          "- button "Underline":
          - img",
          "- button "Italic":
          - img",
          "- button "Bold":
          - img",
          "- button "Paragraph":
          - img
          - text: Paragraph",
        ]
      `);
      expect(toolbar.element().contains(document.activeElement)).toBe(false);
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
