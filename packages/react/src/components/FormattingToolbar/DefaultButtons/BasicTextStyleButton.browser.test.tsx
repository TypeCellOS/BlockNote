import { describe, expect } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import {
  BlockNoteSchema,
  createStyleSpec,
  defaultStyleSpecs,
} from "@blocknote/core";
import { BasicTextStyleButton } from "./BasicTextStyleButton.js";
import { FormattingToolbar } from "../FormattingToolbar.js";

const STYLES = ["bold", "italic", "underline", "strike", "code"] as const;

describe("BasicTextStyleButton", () => {
  describe("unit", () => {
    it("hides in read-only mode and responds to editability changes", async ({
      setupEditor,
      page,
    }) => {
      const { rerender } = await setupEditor({
        props: { editable: false, formattingToolbar: false },
        children: <BasicTextStyleButton basicTextStyle="bold" />,
      });
      const button = page.getByRole("button", { name: "Bold", exact: true });
      await expect.element(button).not.toBeInTheDocument();

      rerender({ editable: true });
      await expect.element(button).toBeVisible();
      await expect.element(button).toHaveAttribute("aria-pressed", "false");

      rerender({ editable: false });
      await expect.element(button).not.toBeInTheDocument();
    });

    it("hides when the style is missing from the schema", async ({
      setupEditor,
      page,
    }) => {
      await setupEditor({
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
      setupEditor,
      page,
    }) => {
      await setupEditor({
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
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      await expect.element(button).toBeVisible();
      await expect.element(button).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("integration", () => {
    it.for(STYLES)(
      "toggles %s on and off",
      async (
        basicTextStyle,
        { setupEditor, selectText, compareDocuments, page },
      ) => {
        const { editor } = await setupEditor({
          initialContent: [
            { id: "format", type: "paragraph", content: "Format this text" },
          ],
          props: { formattingToolbar: false },
          children: <BasicTextStyleButton basicTextStyle={basicTextStyle} />,
        });
        selectText(editor, "Format this text");
        const button = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar[basicTextStyle].tooltip,
          exact: true,
        });
        const plain =
          '<block-format path="0" type="paragraph">Format this text</block-format>';
        const styled = `<block-format path="0" type="paragraph"><text ${basicTextStyle}=true>Format this text</text></block-format>`;

        for (const state of ["on", "off"] as const) {
          const before = editor.document;

          await button.click();

          expect(compareDocuments(before, editor.document)).toEqual(
            `BEFORE:\n${state === "on" ? plain : styled}\n\nAFTER:\n${state === "on" ? styled : plain}`,
          );
          await expect
            .element(button)
            .toHaveAttribute("aria-pressed", String(state === "on"));
        }
      },
    );

    it.for(STYLES)(
      "applies %s only to selected text without changing surrounding content",
      async (
        basicTextStyle,
        { setupEditor, selectText, compareDocuments, page },
      ) => {
        const { editor } = await setupEditor({
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
        const before = editor.document;
        const button = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar[basicTextStyle].tooltip,
          exact: true,
        });
        const selectedStyles =
          basicTextStyle === "code"
            ? "code=true"
            : `${basicTextStyle}=true textColor="red"`;

        await button.click();

        expect(compareDocuments(before, editor.document)).toEqual(`BEFORE:
<block-format path="0" type="paragraph"><text textColor="red">Before selected after</text></block-format>

AFTER:
<block-format path="0" type="paragraph"><text textColor="red">Before </text><text ${selectedStyles}>selected</text><text textColor="red"> after</text></block-format>`);
      },
    );

    it.for(STYLES)(
      "applies %s to subsequently typed text at a collapsed cursor",
      async (basicTextStyle, { setupEditor, compareDocuments, page }) => {
        const { editor } = await setupEditor({
          initialContent: [
            { id: "format", type: "paragraph", content: "Existing" },
          ],
          props: { formattingToolbar: false },
          children: <BasicTextStyleButton basicTextStyle={basicTextStyle} />,
        });
        editor.setTextCursorPosition("format", "end");
        const before = editor.document;
        const button = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar[basicTextStyle].tooltip,
          exact: true,
        });

        await button.click();
        await userEvent.keyboard(" typed");

        expect(compareDocuments(before, editor.document)).toEqual(`BEFORE:
<block-format path="0" type="paragraph">Existing</block-format>

AFTER:
<block-format path="0" type="paragraph">Existing<text ${basicTextStyle}=true> typed</text></block-format>`);
      },
    );
  });

  describe("aria", () => {
    it("reflects the active style when selection moves between blocks", async ({
      setupEditor,
      selectText,
      page,
    }) => {
      const { editor } = await setupEditor({
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

  describe("axe", () => {
    it("checks all supported style buttons", async ({
      setupEditor,
      runAxe,
      page,
    }) => {
      await setupEditor({
        props: { formattingToolbar: false },
        children: (
          <FormattingToolbar>
            {STYLES.map((style) => (
              <BasicTextStyleButton key={style} basicTextStyle={style} />
            ))}
          </FormattingToolbar>
        ),
      });

      const { violations } = await runAxe(page.getByRole("toolbar"));
      expect(violations).toEqual([]);
    });
  });

  describe("keyboard", () => {
    it.for(STYLES)(
      "shows a keyboard focus ring for %s",
      async (
        style,
        { setupEditor, selectText, captureFocusOutline, pressKey, page },
      ) => {
        const { editor } = await setupEditor({
          initialContent: [{ type: "paragraph", content: "Selected text" }],
          props: { formattingToolbar: false },
          children: <BasicTextStyleButton basicTextStyle={style} />,
        });
        await page.getByRole("textbox").click();
        selectText(editor, "Selected text");
        const button = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar[style].tooltip,
          exact: true,
        });
        const compareFocusOutline = captureFocusOutline(button);

        await pressKey("Tab");

        await expect.element(button).toHaveFocus();
        await compareFocusOutline(button);
      },
    );

    it.for(["Enter", "Space"])(
      "activates with %s and returns focus to the editor",
      async (key, { setupEditor, selectText, pressKey, page }) => {
        const { editor } = await setupEditor({
          initialContent: [{ type: "paragraph", content: "Selected text" }],
          props: { formattingToolbar: false },
          children: <BasicTextStyleButton basicTextStyle="bold" />,
        });
        await page.getByRole("textbox").click();
        selectText(editor, "Selected text");
        const button = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar.bold.tooltip,
          exact: true,
        });

        await pressKey("Tab");

        await expect.element(button).toHaveFocus();

        await pressKey(key);

        await expect.element(button).toHaveAttribute("aria-pressed", "true");
        await expect.element(page.getByRole("textbox")).toHaveFocus();
      },
    );
  });
});
