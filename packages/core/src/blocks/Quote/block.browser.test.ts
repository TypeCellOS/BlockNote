import { describe, expect } from "vite-plus/test";

import { insertOrUpdateBlockForSlashMenu } from "../../extensions/SuggestionMenu/getDefaultSlashMenuItems.js";

describe("pasting into an empty quote (#2236)", () => {
  it.for(["text", "html"] as const)(
    "preserves the quote when pasting %s",
    async (format, { setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: [{ id: "source", type: "paragraph" }],
      });
      editor.setTextCursorPosition("source", "start");
      insertOrUpdateBlockForSlashMenu(editor, { type: "quote" });

      if (format === "text") {
        editor.pasteText("Pasted paragraph");
      } else {
        editor.pasteHTML("<p>Pasted paragraph</p>");
      }

      expect(editor.document[0]).toMatchObject({
        type: "quote",
        content: [{ type: "text", text: "Pasted paragraph", styles: {} }],
      });
      expect(
        editor.document.filter(
          (block) => Array.isArray(block.content) && block.content.length > 0,
        ),
      ).toHaveLength(1);
    },
  );
});
