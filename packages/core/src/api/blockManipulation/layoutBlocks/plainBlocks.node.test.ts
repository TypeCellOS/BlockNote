import { describe, expect } from "vite-plus/test";
import { plainNoteContent, schema, text } from "./plainBlocks.fixture.js";

describe("plain blocks whose Enter goes into their children", () => {
  it("preserves text and children when converting between plain, inline, and layout blocks", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      schema,
      initialContent: plainNoteContent("First\nSecond"),
    });

    editor.updateBlock("note", { type: "alert" });
    expect(editor.getBlock("note")!.children[0].id).toBe("body");
    editor.updateBlock("note", { type: "plainNote" });
    expect(text(editor, "note")).toBe("First\nSecond");
    editor.updateBlock("note", { type: "callout" });
    const layoutBlock = editor.document[0];
    expect(text(editor, layoutBlock.children[0].id)).toBe("First\nSecond");
    expect(layoutBlock.children[1].id).toBe("body");
    editor.transact((tr) => tr.doc.check());
  });
});
