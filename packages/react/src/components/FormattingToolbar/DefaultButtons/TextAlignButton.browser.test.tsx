import { describe, expect } from "vite-plus/test";
import { TextAlignButton } from "./TextAlignButton.js";

describe("TextAlignButton", () => {
  it.for(["left", "center", "right"] as const)(
    "aligns the selected block %s without changing its text or neighboring blocks",
    async (textAlignment, { renderEditor, selectText, page }) => {
      const { editor } = await renderEditor({
        initialContent: [
          { id: "before", type: "paragraph", content: "Before" },
          {
            id: "selected",
            type: "paragraph",
            props: {
              textAlignment: textAlignment === "left" ? "center" : "left",
            },
            content: "Selected text",
          },
          { id: "after", type: "paragraph", content: "After" },
        ],
        props: { formattingToolbar: false },
        children: <TextAlignButton textAlignment={textAlignment} />,
      });
      selectText(editor, "Selected text");
      const documentBefore = editor.document;
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar[`align_${textAlignment}`]
          .tooltip,
        exact: true,
      });
      await expect.element(button).toHaveAttribute("aria-pressed", "false");

      await button.click();

      expect(editor.document).toEqual([
        documentBefore[0],
        {
          ...documentBefore[1],
          props: { ...documentBefore[1].props, textAlignment },
        },
        documentBefore[2],
      ]);
      await expect.element(button).toHaveAttribute("aria-pressed", "true");
    },
  );
});
