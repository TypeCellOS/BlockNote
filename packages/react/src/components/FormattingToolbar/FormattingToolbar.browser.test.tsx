import { describe, expect } from "vite-plus/test";
import { FormattingToolbar } from "./FormattingToolbar.js";

describe("FormattingToolbar", () => {
  describe("unit", () => {
    it("allows custom children instead of default controls", async ({
      setupEditor,
      page,
    }) => {
      await setupEditor({
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
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
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
    it("toggles inline code on and off from the default toolbar", async ({
      setupEditor,
      selectText,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "format", type: "paragraph", content: "Use fetch here" },
        ],
      });
      const before = editor.document;
      selectText(editor, "fetch");

      const button = page.getByRole("toolbar").getByRole("button", {
        name: editor.dictionary.formatting_toolbar.code.tooltip,
        exact: true,
      });
      await expect.element(button).toBeVisible();
      await button.click();

      await expect.element(button).toHaveAttribute("aria-pressed", "true");
      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-format path="0" type="paragraph">Use fetch here</block-format>

        AFTER:
        <block-format path="0" type="paragraph">Use <text code=true>fetch</text> here</block-format>"
      `);

      await button.click();

      await expect.element(button).toHaveAttribute("aria-pressed", "false");
      expect(editor.document).toEqual(before);
    });

    it("preserves the editor selection while keyboard focus moves through the toolbar", async ({
      setupEditor,
      selectText,
      pressKey,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { type: "paragraph", content: "Before selected text after" },
        ],
      });
      await page.getByRole("textbox").click();
      selectText(editor, "selected text");
      const toolbar = page.getByRole("toolbar");
      const documentBefore = editor.document;

      await pressKey("Tab");

      await expect
        .element(
          toolbar.getByRole("button", {
            name: editor.dictionary.slash_menu.paragraph.title,
            exact: true,
          }),
        )
        .toHaveFocus();
      expect(editor.getSelectedText()).toBe("selected text");

      await pressKey("Tab");

      await expect
        .element(
          toolbar.getByRole("button", {
            name: editor.dictionary.formatting_toolbar.bold.tooltip,
            exact: true,
          }),
        )
        .toHaveFocus();
      expect(editor.getSelectedText()).toBe("selected text");
      expect(editor.document).toEqual(documentBefore);
    });
  });

  describe("aria", () => {
    it("exposes its custom controls as a toolbar", async ({
      setupEditor,
      page,
    }) => {
      await setupEditor({
        props: { formattingToolbar: false },
        children: (
          <FormattingToolbar>
            <button>Custom action</button>
          </FormattingToolbar>
        ),
      });

      await expect.element(page.getByRole("toolbar"))
        .toMatchAriaInlineSnapshot(`
        - toolbar:
          - button "Custom action"
      `);
    });
  });

  describe("axe", () => {
    it("has no automated accessibility violations with the default controls", async ({
      setupEditor,
      selectText,
      page,
      runAxe,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
      });
      selectText(editor, "Selected text");
      await expect.element(page.getByRole("toolbar")).toBeVisible();

      const { violations } = await runAxe(page.getByRole("toolbar"));
      expect(violations).toEqual([]);
    });
  });

  describe("keyboard", () => {
    it("tabs forward through the default controls for Parent and allows leaving", async ({
      setupEditor,
      selectText,
      focusUntil,
      readAriaSnapshot,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      // Record each control's accessible tree in keyboard focus order,
      // so the snapshot detects skipped controls or changes in tab order.
      const sequence: string[] = [];

      await focusUntil(async (active) => {
        if (!toolbar.element().contains(active.element())) {
          return true;
        }
        await expect.element(active).toBeEnabled();
        sequence.push(readAriaSnapshot(active));
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
          "- button "Code":
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
      setupEditor,
      selectText,
      focusUntil,
      readAriaSnapshot,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      // Record each control's accessible tree in keyboard focus order,
      // so the snapshot detects skipped controls or changes in tab order.
      const sequence: string[] = [];

      await focusUntil(async (active) => {
        if (!toolbar.element().contains(active.element())) {
          return true;
        }
        await expect.element(active).toBeEnabled();
        sequence.push(readAriaSnapshot(active));
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
          "- button "Code":
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
      setupEditor,
      selectText,
      focusUntil,
      readAriaSnapshot,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      // Record each control's accessible tree in keyboard focus order,
      // so the snapshot detects skipped controls or changes in tab order.
      const sequence: string[] = [];

      await focusUntil(async (active) => {
        if (!toolbar.element().contains(active.element())) {
          return true;
        }
        await expect.element(active).toBeEnabled();
        sequence.push(readAriaSnapshot(active));
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
          "- button "Code":
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
      setupEditor,
      selectText,
      focusUntil,
      readAriaSnapshot,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      // Record each control's accessible tree in keyboard focus order,
      // so the snapshot detects skipped controls or changes in tab order.
      const sequence = [readAriaSnapshot(lastControl)];

      await focusUntil(async (active) => {
        if (!toolbar.element().contains(active.element())) {
          return true;
        }
        await expect.element(active).toBeEnabled();
        sequence.push(readAriaSnapshot(active));
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
          "- button "Code":
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
      setupEditor,
      selectText,
      focusUntil,
      readAriaSnapshot,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      // Record each control's accessible tree in keyboard focus order,
      // so the snapshot detects skipped controls or changes in tab order.
      const sequence = [readAriaSnapshot(lastControl)];

      await focusUntil(async (active) => {
        if (!toolbar.element().contains(active.element())) {
          return true;
        }
        await expect.element(active).toBeEnabled();
        sequence.push(readAriaSnapshot(active));
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
          "- button "Code":
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
      setupEditor,
      selectText,
      focusUntil,
      readAriaSnapshot,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      // Record each control's accessible tree in keyboard focus order,
      // so the snapshot detects skipped controls or changes in tab order.
      const sequence = [readAriaSnapshot(lastControl)];

      await focusUntil(async (active) => {
        if (!toolbar.element().contains(active.element())) {
          return true;
        }
        await expect.element(active).toBeEnabled();
        sequence.push(readAriaSnapshot(active));
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
          "- button "Code":
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
});
