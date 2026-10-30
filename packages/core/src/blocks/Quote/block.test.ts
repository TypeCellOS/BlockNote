// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { insertOrUpdateBlockForSlashMenu } from "../../extensions/SuggestionMenu/getDefaultSlashMenuItems.js";

let editor: BlockNoteEditor | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  editor?.unmount();
  container?.remove();
});

describe("pasting into an empty quote (#2236)", () => {
  it.each(["text", "html"] as const)(
    "preserves the quote when pasting %s",
    (format) => {
      container = document.createElement("div");
      document.body.append(container);
      editor = BlockNoteEditor.create({
        initialContent: [{ id: "source", type: "paragraph" }],
      });
      editor.mount(container);
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
