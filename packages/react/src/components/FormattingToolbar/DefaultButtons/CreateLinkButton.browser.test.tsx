import { describe, expect } from "vite-plus/test";
import { CreateLinkButton } from "./CreateLinkButton.js";

describe("CreateLinkButton", () => {
  describe("unit", () => {
    it("requires selected text and responds to editability changes", async ({
      setupEditor,
      selectText,
      page,
    }) => {
      const { editor, rerender } = await setupEditor({
        initialContent: [
          { id: "text", type: "paragraph", content: "Selected text" },
        ],
        props: { formattingToolbar: false },
        children: <CreateLinkButton />,
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.link.tooltip,
        exact: true,
      });
      await expect.element(button).not.toBeInTheDocument();

      selectText(editor, "Selected text");
      await expect.element(button).toBeVisible();

      rerender({ editable: false });
      await expect.element(button).not.toBeInTheDocument();

      rerender({ editable: true });
      await expect.element(button).toBeVisible();

      editor.setTextCursorPosition("text", "end");
      await expect.element(button).not.toBeInTheDocument();
    });

    it("prefills the selected link and closes the form when selection changes", async ({
      setupEditor,
      selectText,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          {
            id: "text",
            type: "paragraph",
            content: [
              {
                type: "link",
                href: "https://example.com",
                content: "Linked text",
              },
              { type: "text", text: " Plain text", styles: {} },
            ],
          },
        ],
        props: { formattingToolbar: false },
        children: <CreateLinkButton />,
      });
      selectText(editor, "Linked text");
      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.link.tooltip,
          exact: true,
        })
        .click();
      const input = page.getByPlaceholder(
        editor.dictionary.link_toolbar.form.url_placeholder,
      );
      await expect.element(input).toHaveValue("https://example.com");

      selectText(editor, "Plain text");

      await expect.element(input).not.toBeInTheDocument();
    });
  });

  describe("integration", () => {
    it("submits a link for the original substring and returns focus to the editor", async ({
      setupEditor,
      selectText,
      compareDocuments,
      pressKey,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          {
            id: "text",
            type: "paragraph",
            content: "Before selected text after",
          },
        ],
        props: { formattingToolbar: false },
        children: <CreateLinkButton />,
      });
      selectText(editor, "selected text");
      const before = editor.document;
      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.link.tooltip,
          exact: true,
        })
        .click();
      const input = page.getByPlaceholder(
        editor.dictionary.link_toolbar.form.url_placeholder,
      );

      await input.fill("https://example.com");
      await pressKey("Enter");

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-text path="0" type="paragraph">Before selected text after</block-text>

        AFTER:
        <block-text path="0" type="paragraph">Before <link href="https://example.com">selected text</link> after</block-text>"
      `);
      await expect.element(input).not.toBeInTheDocument();
      await expect.element(page.getByRole("textbox")).toHaveFocus();
    });

    it("opens the link form without changing the selected text range or document", async ({
      setupEditor,
      selectText,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          {
            id: "text",
            type: "paragraph",
            content: "Before selected text after",
          },
        ],
        props: { formattingToolbar: false },
        children: <CreateLinkButton />,
      });
      selectText(editor, "selected text");
      const documentBefore = editor.document;

      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.link.tooltip,
          exact: true,
        })
        .click();

      await expect
        .element(
          page.getByPlaceholder(
            editor.dictionary.link_toolbar.form.url_placeholder,
          ),
        )
        .toHaveFocus();
      expect(editor.getSelectedText()).toBe("selected text");
      expect(editor.document).toEqual(documentBefore);
    });
  });

  describe("aria", () => {
    it("exposes the popup's relationship to its named trigger and its URL field", async ({
      setupEditor,
      selectText,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: <CreateLinkButton />,
      });
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.link.tooltip,
        exact: true,
      });
      await expect.element(button).toHaveAttribute("aria-haspopup", "dialog");
      await expect.element(button).toHaveAttribute("aria-expanded", "false");

      await button.click();

      const dialog = page.getByRole("dialog");
      await expect.element(dialog).toBeVisible();
      await expect.element(button).toHaveAttribute("aria-expanded", "true");
      expect(button.element().getAttribute("aria-controls")).toBe(
        dialog.element().id,
      );
      expect(dialog.element().getAttribute("aria-labelledby")).toBe(
        button.element().id,
      );
      await expect
        .element(
          dialog.getByPlaceholder(
            editor.dictionary.link_toolbar.form.url_placeholder,
          ),
        )
        .toHaveFocus();
    });
  });

  describe("axe", () => {
    it("checks the closed trigger", async ({
      setupEditor,
      selectText,
      runAxe,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: <CreateLinkButton />,
      });
      selectText(editor, "Selected text");

      await expect
        .element(
          page.getByRole("button", {
            name: editor.dictionary.formatting_toolbar.link.tooltip,
            exact: true,
          }),
        )
        .toBeVisible();
      const { violations } = await runAxe(
        page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar.link.tooltip,
          exact: true,
        }),
      );
      expect(violations).toEqual([]);
    });
    it("opens a link form with no automated accessibility violations", async ({
      setupEditor,
      selectText,
      runAxe,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: <CreateLinkButton />,
      });
      selectText(editor, "Selected text");

      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.link.tooltip,
          exact: true,
        })
        .click();

      await expect
        .element(
          page.getByPlaceholder(
            editor.dictionary.link_toolbar.form.url_placeholder,
          ),
        )
        .toBeVisible();
      const { violations } = await runAxe(page.getByRole("dialog"));
      expect(violations).toEqual([]);
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
        children: <CreateLinkButton />,
      });
      editor.focus();
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.link.tooltip,
        exact: true,
      });
      await expect.element(button).toBeVisible();
      const compareFocusOutline = captureFocusOutline(button);
      await pressKey("Tab");
      await compareFocusOutline(button);

      await expect.element(button).toHaveFocus();
    });

    // Our Mantine form-popover CSS removes the input border, and there is no
    // replacement keyboard focus outline (blocknoteStyles.css).
    it.fails("shows a visible keyboard focus indicator on the URL field", async ({
      setupEditor,
      selectText,
      pressKey,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: <CreateLinkButton />,
      });
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.link.tooltip,
        exact: true,
      });
      await expect.element(button).toBeVisible();
      button.element().focus();

      await pressKey("Enter");

      const input = page.getByPlaceholder(
        editor.dictionary.link_toolbar.form.url_placeholder,
      );
      await expect.element(input).toHaveFocus();
      // The focused input's computed style is available now. Polling a known
      // missing outline just waits out the assertion timeout.
      expect(getComputedStyle(input.element()).outlineStyle).not.toMatch(
        /^(none|hidden)$/,
      );
    });

    it("opens with Enter and returns focus to its trigger on Escape without editing", async ({
      setupEditor,
      selectText,
      pressKey,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: <CreateLinkButton />,
      });
      selectText(editor, "Selected text");
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.link.tooltip,
        exact: true,
      });
      const documentBefore = editor.document;
      await expect.element(button).toBeVisible();
      button.element().focus();

      await pressKey("Enter");

      const input = page.getByPlaceholder(
        editor.dictionary.link_toolbar.form.url_placeholder,
      );
      await expect.element(input).toHaveFocus();

      await pressKey("Escape");

      await expect.element(input).not.toBeInTheDocument();
      await expect.element(button).toHaveFocus();
      expect(editor.document).toEqual(documentBefore);
      expect(editor.getSelectedText()).toBe("Selected text");
    });

    it("opens with the editor's link shortcut but not in read-only mode", async ({
      setupEditor,
      selectText,
      pressKey,
      page,
    }) => {
      const { editor, rerender } = await setupEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: <CreateLinkButton />,
      });
      editor.focus();
      selectText(editor, "Selected text");

      await pressKey("Control+k");

      const input = page.getByPlaceholder(
        editor.dictionary.link_toolbar.form.url_placeholder,
      );
      await expect.element(input).toHaveFocus();
      await pressKey("Escape");
      rerender({ editable: false });

      // Read-only content is not a textbox, but still receives DOM key events.
      const shortcut = new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      editor.domElement!.dispatchEvent(shortcut);

      await expect.element(input).not.toBeInTheDocument();
      expect(shortcut.defaultPrevented).toBe(false);
    });
  });
});
