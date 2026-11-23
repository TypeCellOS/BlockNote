import { closeHistory } from "@tiptap/pm/history";
import { describe, expect } from "vite-plus/test";

import {
  installHeadlessPlugins,
  typeText,
} from "../../../../extensions/testHeadlessEditor.js";

describe("Test updateBlock undo/redo", () => {
  it("undoes divider autoformat before undoing the typed dashes", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [{ id: "autoformat-paragraph", type: "paragraph" }],
    });
    installHeadlessPlugins(editor);
    editor.setTextCursorPosition("autoformat-paragraph", "start");
    const view = editor.prosemirrorView;
    // Keep fixture preparation out of the typed text's undo item.
    view.dispatch(closeHistory(view.state.tr));

    typeText(editor, "---");

    expect(editor.document).toHaveLength(1);
    expect(editor.document[0].type).toBe("divider");

    expect(editor.undo()).toBe(true);
    expect(editor.document[0]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "---", styles: {} }],
    });
    expect(view.state.selection.empty).toBe(true);
    expect(view.state.selection.$from.parentOffset).toBe(3);

    expect(editor.undo()).toBe(true);
    expect(view.state.doc.textContent).toBe("");
  });
});
