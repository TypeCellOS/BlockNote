import { describe, expect } from "vite-plus/test";
import { CreateLinkButton } from "./CreateLinkButton.js";

describe("CreateLinkButton", () => {
  it("submits a link for the original substring and returns focus to the editor", async ({
    renderEditor,
    selectText,
    commands,
    page,
  }) => {
    const { editor } = await renderEditor({
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
    await commands.pressKey("Enter");

    expect(editor.getBlock("text")?.content).toEqual([
      { type: "text", text: "Before ", styles: {} },
      {
        type: "link",
        href: "https://example.com",
        content: [{ type: "text", text: "selected text", styles: {} }],
      },
      { type: "text", text: " after", styles: {} },
    ]);
    await expect.element(input).not.toBeInTheDocument();
    await expect.element(page.getByRole("textbox")).toHaveFocus();
  });

  it("opens the link form without changing the selected text range or document", async ({
    renderEditor,
    selectText,
    page,
  }) => {
    const { editor } = await renderEditor({
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
    const selectionBefore = editor.prosemirrorState.selection.toJSON();

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
    expect(editor.prosemirrorState.selection.toJSON()).toEqual(selectionBefore);
    expect(editor.document).toEqual(documentBefore);
  });

  describe("axe", () => {
    it("opens a link form with no automated accessibility violations", async ({
      renderEditor,
      selectText,
      annotate,
      commands,
      page,
    }) => {
      const { editor } = await renderEditor({
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
      for (const warning of await commands.checkAxe(".bn-form-popover")) {
        await annotate(warning, "warning");
      }
    });
  });
});
