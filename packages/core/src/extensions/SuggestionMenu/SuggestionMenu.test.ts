import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

/**
 * @vitest-environment jsdom
 */

/**
 * Find the SuggestionMenu ProseMirror plugin instance from the editor state.
 * We need to do this because the PluginKey is not exported, and creating a new
 * PluginKey with the same name gives a different instance.
 */
function findSuggestionPlugin(editor: BlockNoteEditor) {
  const state = editor._tiptapEditor.state;
  const plugin = state.plugins.find(
    (p) => (p as any).key === "SuggestionMenuPlugin$",
  );
  if (!plugin) {
    throw new Error("SuggestionMenuPlugin not found in editor state");
  }
  return plugin;
}

function getSuggestionPluginState(editor: BlockNoteEditor) {
  const plugin = findSuggestionPlugin(editor);
  return plugin.getState(editor._tiptapEditor.state);
}

/**
 * Simulates typing a trigger character and dispatching the suggestion menu
 * meta, mirroring what `handleTextInput` does when the user types "/".
 */
function triggerSuggestionMenu(editor: BlockNoteEditor, char: string) {
  const plugin = findSuggestionPlugin(editor);
  const view = editor._tiptapEditor.view;
  // First insert the trigger character (like handleTextInput does)
  view.dispatch(view.state.tr.insertText(char));
  // Then dispatch the meta to activate the suggestion menu
  view.dispatch(
    view.state.tr
      .setMeta(plugin, {
        triggerCharacter: char,
      })
      .scrollIntoView(),
  );
}

function createEditor() {
  const editor = BlockNoteEditor.create();
  const div = document.createElement("div");
  editor.mount(div);
  return editor;
}

describe("SuggestionMenu", () => {
  it("should open suggestion menu in a paragraph", () => {
    const editor = createEditor();

    editor.replaceBlocks(editor.document, [
      {
        id: "paragraph-0",
        type: "paragraph",
        content: "Hello world",
      },
    ]);

    editor.setTextCursorPosition("paragraph-0", "end");

    // Verify we start with no active suggestion menu
    expect(getSuggestionPluginState(editor)).toBeUndefined();

    // Trigger the suggestion menu
    triggerSuggestionMenu(editor, "/");

    // Plugin state should now be defined (menu opened)
    const pluginState = getSuggestionPluginState(editor);
    expect(pluginState).toBeDefined();
    expect(pluginState.triggerCharacter).toBe("/");

    editor._tiptapEditor.destroy();
  });

  it("should not open suggestion menu in table content", () => {
    const editor = createEditor();

    editor.replaceBlocks(editor.document, [
      {
        id: "table-0",
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["Cell 1", "Cell 2", "Cell 3"],
            },
            {
              cells: ["Cell 4", "Cell 5", "Cell 6"],
            },
          ],
        },
      },
    ]);

    // Place cursor inside a table cell
    editor.setTextCursorPosition("table-0", "start");

    // Verify the cursor is inside table content (the parent node is
    // a tableParagraph which belongs to the "tableContent" group)
    const $from = editor._tiptapEditor.state.selection.$from;
    expect($from.parent.type.isInGroup("tableContent")).toBe(true);

    // Verify we start with no active suggestion menu
    expect(getSuggestionPluginState(editor)).toBeUndefined();

    // Attempt to trigger the suggestion menu
    triggerSuggestionMenu(editor, "/");

    // Plugin state should remain undefined because the cursor is inside
    // table content, and the fix prevents the menu from activating there
    expect(getSuggestionPluginState(editor)).toBeUndefined();

    editor._tiptapEditor.destroy();
  });
});
