import { describe, expect } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import {
  BlockNoteSchema,
  createStyleSpec,
  defaultStyleSpecs,
} from "@blocknote/core";
import { BasicTextStyleButton } from "./BasicTextStyleButton.js";

const STYLES = ["bold", "italic", "underline", "strike", "code"] as const;

describe("BasicTextStyleButton", () => {
  it.for(STYLES)(
    "toggles %s on and off",
    async (basicTextStyle, { renderEditor, selectText }) => {
      const { editor } = await renderEditor({
        initialContent: [
          { id: "format", type: "paragraph", content: "Format this text" },
        ],
        // To test just the button, we don't even need the toolbar
        // the button reads the editor context directly
        props: { formattingToolbar: false },
        children: <BasicTextStyleButton basicTextStyle={basicTextStyle} />,
      });

      selectText(editor, "Format this text");

      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar[basicTextStyle].tooltip,
        exact: true,
      });

      for (const state of ["on", "off"] as const) {
        await button.click();

        expect(editor.getBlock("format")).toMatchSnapshot(state);
        await expect
          .element(button)
          .toHaveAttribute("aria-pressed", String(state === "on"));
      }
    },
  );

  it.for(STYLES)(
    "applies %s only to selected text without changing surrounding content",
    async (basicTextStyle, { renderEditor, selectText }) => {
      const { editor } = await renderEditor({
        initialContent: [
          {
            id: "format",
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Before selected after",
                styles: { textColor: "red" },
              },
            ],
          },
        ],
        props: { formattingToolbar: false },
        children: <BasicTextStyleButton basicTextStyle={basicTextStyle} />,
      });
      selectText(editor, "selected");
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar[basicTextStyle].tooltip,
        exact: true,
      });

      await button.click();

      expect(editor.getBlock("format")?.content).toEqual([
        { type: "text", text: "Before ", styles: { textColor: "red" } },
        {
          type: "text",
          text: "selected",
          // Inline code excludes other formatting styles.
          styles:
            basicTextStyle === "code"
              ? { code: true }
              : { textColor: "red", [basicTextStyle]: true },
        },
        { type: "text", text: " after", styles: { textColor: "red" } },
      ]);
    },
  );

  it.for(STYLES)(
    "applies %s to subsequently typed text at a collapsed cursor",
    async (basicTextStyle, { renderEditor }) => {
      const { editor } = await renderEditor({
        initialContent: [
          { id: "format", type: "paragraph", content: "Existing" },
        ],
        props: { formattingToolbar: false },
        children: <BasicTextStyleButton basicTextStyle={basicTextStyle} />,
      });
      editor.setTextCursorPosition("format", "end");
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar[basicTextStyle].tooltip,
        exact: true,
      });

      await button.click();
      await userEvent.keyboard(" typed");

      expect(editor.getBlock("format")?.content).toEqual([
        { type: "text", text: "Existing", styles: {} },
        { type: "text", text: " typed", styles: { [basicTextStyle]: true } },
      ]);
    },
  );

  it("hides in read-only mode and responds to editability changes", async ({
    renderEditor,
  }) => {
    const { rerender } = await renderEditor({
      props: { editable: false, formattingToolbar: false },
      children: <BasicTextStyleButton basicTextStyle="bold" />,
    });
    const button = page.getByRole("button", { name: "Bold", exact: true });
    await expect.element(button).not.toBeInTheDocument();

    rerender({ editable: true });
    await expect.element(button).toHaveAttribute("aria-pressed", "false");

    rerender({ editable: false });
    await expect.element(button).not.toBeInTheDocument();
  });

  it("hides when the style is missing from the schema", async ({
    renderEditor,
  }) => {
    await renderEditor({
      schema: BlockNoteSchema.create({
        styleSpecs: { italic: defaultStyleSpecs.italic },
      }),
      props: { formattingToolbar: false },
      children: <BasicTextStyleButton basicTextStyle="bold" />,
    });
    const button = page.getByRole("button", { name: "Bold", exact: true });
    await expect.element(button).not.toBeInTheDocument();
  });

  it("hides when the style has a non-boolean prop schema", async ({
    renderEditor,
  }) => {
    await renderEditor({
      schema: BlockNoteSchema.create({
        styleSpecs: {
          bold: createStyleSpec(
            { type: "bold", propSchema: "string" },
            { render: () => ({ dom: document.createElement("span") }) },
          ),
        },
      }),
      props: { formattingToolbar: false },
      children: <BasicTextStyleButton basicTextStyle="bold" />,
    });
    const button = page.getByRole("button", { name: "Bold", exact: true });
    await expect.element(button).not.toBeInTheDocument();
  });

  it("hides on blocks without inline content and reappears on text blocks", async ({
    renderEditor,
  }) => {
    const { editor } = await renderEditor({
      initialContent: [
        { id: "divider", type: "divider" },
        { id: "text", type: "paragraph", content: "Text" },
      ],
      props: { formattingToolbar: false },
      children: <BasicTextStyleButton basicTextStyle="bold" />,
    });
    const button = page.getByRole("button", { name: "Bold", exact: true });
    editor.setTextCursorPosition("divider");
    await expect.element(button).not.toBeInTheDocument();

    editor.setTextCursorPosition("text");
    await expect.element(button).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects the active style when selection moves between blocks", async ({
    renderEditor,
    selectText,
  }) => {
    const { editor } = await renderEditor({
      initialContent: [
        {
          id: "styled",
          type: "paragraph",
          content: [{ type: "text", text: "Bold", styles: { bold: true } }],
        },
        { id: "plain", type: "paragraph", content: "Plain" },
      ],
      props: { formattingToolbar: false },
      children: <BasicTextStyleButton basicTextStyle="bold" />,
    });
    const button = page.getByRole("button", { name: "Bold", exact: true });
    selectText(editor, "Bold");
    await expect.element(button).toHaveAttribute("aria-pressed", "true");

    selectText(editor, "Plain");
    await expect.element(button).toHaveAttribute("aria-pressed", "false");

    selectText(editor, "Bold");
    await expect.element(button).toHaveAttribute("aria-pressed", "true");
  });
});
