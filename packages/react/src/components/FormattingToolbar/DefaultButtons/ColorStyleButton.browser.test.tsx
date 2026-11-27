import { BlockNoteSchema, defaultStyleSpecs } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";
import { ColorStyleButton } from "./ColorStyleButton.js";
import { viewProps } from "./defaultButton.test.fixture.js";

describe("ColorStyleButton", () => {
  describe("unit", () => {
    it("only offers text colors when the schema does not support background colors", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        schema: BlockNoteSchema.create({
          styleSpecs: { textColor: defaultStyleSpecs.textColor },
        }),
        props: viewProps,
        children: <ColorStyleButton />,
      });

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
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        schema: BlockNoteSchema.create({
          styleSpecs: { backgroundColor: defaultStyleSpecs.backgroundColor },
        }),
        props: viewProps,
        children: <ColorStyleButton />,
      });

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
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        schema: BlockNoteSchema.create({
          styleSpecs: { bold: defaultStyleSpecs.bold },
        }),
        props: viewProps,
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
      setupEditor,
      page,
    }) => {
      const { editor, rerender } = await setupEditor({
        initialContent: [
          { id: "text", type: "paragraph", content: "Text" },
          { id: "divider", type: "divider" },
        ],
        props: { ...viewProps, editable: false },
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
    it("applies textColor only to the selected substring", async ({
      setupEditor,
      selectText,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "text", type: "paragraph", content: "Before selected after" },
        ],
        props: viewProps,
        children: <ColorStyleButton />,
      });
      selectText(editor, "selected");
      const before = editor.document;

      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.colors.tooltip,
        exact: true,
      });
      await button.click();

      await page
        .getByRole("menuitem", {
          name: editor.dictionary.color_picker.colors.gray,
        })
        .nth(0)
        .click();

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-text path="0" type="paragraph">Before selected after</block-text>

        AFTER:
        <block-text path="0" type="paragraph">Before <text textColor="gray">selected</text> after</block-text>"
      `);
      await expect.element(button).toHaveAttribute("aria-expanded", "false");
      await expect
        .element(page.getByRole("menu", { includeHidden: true }))
        .not.toBeInTheDocument();
      await expect.element(page.getByRole("textbox")).toHaveFocus();
    });

    it("applies backgroundColor only to the selected substring", async ({
      setupEditor,
      selectText,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "text", type: "paragraph", content: "Before selected after" },
        ],
        props: viewProps,
        children: <ColorStyleButton />,
      });
      selectText(editor, "selected");
      const before = editor.document;

      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.colors.tooltip,
        exact: true,
      });
      await button.click();
      await page
        .getByRole("menuitem", {
          name: editor.dictionary.color_picker.colors.gray,
        })
        .nth(1)
        .click();

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-text path="0" type="paragraph">Before selected after</block-text>

        AFTER:
        <block-text path="0" type="paragraph">Before <text backgroundColor="gray">selected</text> after</block-text>"
      `);
      await expect.element(button).toHaveAttribute("aria-expanded", "false");
      await expect
        .element(page.getByRole("menu", { includeHidden: true }))
        .not.toBeInTheDocument();
      await expect.element(page.getByRole("textbox")).toHaveFocus();
    });

    it("resets textColor without removing the other color", async ({
      setupEditor,
      selectText,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
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
        props: viewProps,
        children: <ColorStyleButton />,
      });
      selectText(editor, "Selected text");
      const before = editor.document;

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
        .nth(0)
        .click();

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-text path="0" type="paragraph"><text textColor="gray" backgroundColor="gray">Selected text</text></block-text>

        AFTER:
        <block-text path="0" type="paragraph"><text backgroundColor="gray">Selected text</text></block-text>"
      `);
    });

    it("resets backgroundColor without removing the other color", async ({
      setupEditor,
      selectText,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
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
        props: viewProps,
        children: <ColorStyleButton />,
      });
      selectText(editor, "Selected text");
      const before = editor.document;

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
        .nth(1)
        .click();

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-text path="0" type="paragraph"><text textColor="gray" backgroundColor="gray">Selected text</text></block-text>

        AFTER:
        <block-text path="0" type="paragraph"><text textColor="gray">Selected text</text></block-text>"
      `);
    });
  });

  describe("aria", () => {
    it("exposes the menu trigger's expanded state and relationship", async ({
      setupEditor,
      selectText,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: viewProps,
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
      setupEditor,
      selectText,
      readAriaSnapshot,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: viewProps,
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
      const before = [readAriaSnapshot(button), readAriaSnapshot(menu)].join(
        "\n",
      );

      await menu
        .getByRole("menuitem", {
          name: editor.dictionary.color_picker.colors.gray,
        })
        .first()
        .click();
      await expect.element(menu).not.toBeInTheDocument();
      await button.click();

      await expect.element(menu).toBeVisible();
      const after = [readAriaSnapshot(button), readAriaSnapshot(menu)].join(
        "\n",
      );
      expect(after).not.toBe(before);
    });
  });

  describe("axe", () => {
    it("checks the color trigger", async ({ setupEditor, runAxe, page }) => {
      const { editor } = await setupEditor({
        props: viewProps,
        children: <ColorStyleButton />,
      });

      const { violations } = await runAxe(
        page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar.colors.tooltip,
          exact: true,
        }),
      );
      expect(violations).toEqual([]);
    });

    // Mantine's placeholder violates aria-required-children. Axe can also report
    // scrollable-region-focusable depending on the menu's scrolling/focus state.
    // Allow only that exact additional known issue, not arbitrary scan failures.
    it("checks the open color menu", async ({ setupEditor, runAxe, page }) => {
      const { editor } = await setupEditor({
        props: viewProps,
        children: <ColorStyleButton />,
      });
      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.colors.tooltip,
          exact: true,
        })
        .click();
      await expect.element(page.getByRole("menu")).toBeVisible();

      const { violations } = await runAxe(page.getByRole("menu"));
      const scrollViolations = violations.filter(
        ({ id }) => id === "scrollable-region-focusable",
      );
      expect(
        violations.filter(({ id }) => id !== "scrollable-region-focusable"),
      ).toMatchObject([
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
      expect(scrollViolations.length).toBeLessThanOrEqual(1);
      for (const violation of scrollViolations) {
        expect(violation).toMatchObject({
          id: "scrollable-region-focusable",
          nodes: [
            {
              any: [
                { id: "focusable-content", data: null },
                { id: "focusable-element", data: null },
              ],
              all: [],
              none: [],
            },
          ],
        });
      }
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
        props: viewProps,
        children: <ColorStyleButton />,
      });
      editor.focus();
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.colors.tooltip,
        exact: true,
      });
      const compareFocusOutline = captureFocusOutline(button);

      await pressKey("Tab");

      await expect.element(button).toHaveFocus();
      await compareFocusOutline(button);
    });

    it("chooses a color with the keyboard and returns focus to the editor", async ({
      setupEditor,
      selectText,
      pressKey,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "text", type: "paragraph", content: "Selected text" },
        ],
        props: viewProps,
        children: <ColorStyleButton />,
      });
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.colors.tooltip,
        exact: true,
      });
      button.element().focus();

      await pressKey("Enter");
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      await expect
        .poll(() => menu.element().contains(document.activeElement))
        .toBe(true);
      await pressKey("ArrowDown");
      await pressKey("ArrowDown");

      await expect
        .element(
          menu
            .getByRole("menuitem", {
              name: editor.dictionary.color_picker.colors.gray,
            })
            .first(),
        )
        .toHaveFocus();

      await pressKey("Enter");

      await expect.element(menu).not.toBeInTheDocument();
      await expect.element(page.getByRole("textbox")).toHaveFocus();
      expect(editor.getActiveStyles().textColor).toBe("gray");
    });
    it("supports opening, navigating, and dismissing its menu without editing the document", async ({
      setupEditor,
      selectText,
      pressKey,
      captureFocusOutline,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: viewProps,
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

      await pressKey("Enter");

      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      await expect
        .poll(() => menu.element().contains(document.activeElement))
        .toBe(true);
      const firstItem = menu.getByRole("menuitem").first();
      const compareFocusOutline = captureFocusOutline(firstItem);

      await pressKey("ArrowDown");

      await expect.element(firstItem).toHaveFocus();
      await compareFocusOutline(firstItem);

      await pressKey("Escape");

      await expect.element(menu).not.toBeInTheDocument();
      await expect.element(button).toHaveFocus();
      expect(editor.document).toEqual(documentBefore);
    });
  });
});
