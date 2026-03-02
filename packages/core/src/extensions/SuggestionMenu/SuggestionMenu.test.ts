import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { SuggestionMenu } from "./SuggestionMenu.js";

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
 * Calls the `handleTextInput` prop of the SuggestionMenu plugin directly,
 * which mirrors what ProseMirror would do when the user types a character.
 * This allows us to test the `shouldTrigger` filtering path.
 */
function simulateTextInput(editor: BlockNoteEditor, char: string): boolean {
  const plugin = findSuggestionPlugin(editor);
  const view = editor._tiptapEditor.view;
  const from = view.state.selection.from;
  const to = view.state.selection.to;
  const handler = plugin.props.handleTextInput;
  if (!handler) {
    throw new Error("handleTextInput not found on SuggestionMenu plugin");
  }
  return (handler as any)(view, from, to, char) as boolean;
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
    const sm = editor.getExtension(SuggestionMenu)!;

    // Register "/" trigger character (no filter)
    sm.addSuggestionMenu({ triggerCharacter: "/" });

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

    // Simulate typing "/" — handleTextInput should trigger the menu
    const handled = simulateTextInput(editor, "/");

    // The input should be handled (menu opened)
    expect(handled).toBe(true);

    // Plugin state should now be defined (menu opened)
    const pluginState = getSuggestionPluginState(editor);
    expect(pluginState).toBeDefined();
    expect(pluginState.triggerCharacter).toBe("/");

    editor._tiptapEditor.destroy();
  });

  it("should not open suggestion menu in table content when shouldTrigger returns false", () => {
    const editor = createEditor();
    const sm = editor.getExtension(SuggestionMenu)!;

    // Register "/" with a shouldTrigger filter that blocks table content.
    // This mirrors what BlockNoteDefaultUI does.
    sm.addSuggestionMenu({
      triggerCharacter: "/",
      shouldOpen: (tr) =>
        !tr.selection.$from.parent.type.isInGroup("tableContent"),
    });

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

    // Verify the cursor is inside table content
    const $from = editor._tiptapEditor.state.selection.$from;
    expect($from.parent.type.isInGroup("tableContent")).toBe(true);

    // Verify we start with no active suggestion menu
    expect(getSuggestionPluginState(editor)).toBeUndefined();

    // Simulate typing "/" — shouldTrigger should prevent the menu from opening
    const handled = simulateTextInput(editor, "/");

    // handleTextInput should return false (not handled) because
    // shouldTrigger rejected the context
    expect(handled).toBe(false);

    // Plugin state should remain undefined
    expect(getSuggestionPluginState(editor)).toBeUndefined();

    editor._tiptapEditor.destroy();
  });

  it("should still allow suggestion menus without shouldTrigger in table content", () => {
    const editor = createEditor();
    const sm = editor.getExtension(SuggestionMenu)!;

    // Register "@" WITHOUT a shouldTrigger filter — should still work in tables
    sm.addSuggestionMenu({ triggerCharacter: "@" });

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

    // Verify the cursor is inside table content
    const $from = editor._tiptapEditor.state.selection.$from;
    expect($from.parent.type.isInGroup("tableContent")).toBe(true);

    // Verify we start with no active suggestion menu
    expect(getSuggestionPluginState(editor)).toBeUndefined();

    // Simulate typing "@" — no shouldTrigger filter, so it should still work
    const handled = simulateTextInput(editor, "@");

    // The input should be handled (menu opened)
    expect(handled).toBe(true);

    // Plugin state should now be defined
    const pluginState = getSuggestionPluginState(editor);
    expect(pluginState).toBeDefined();
    expect(pluginState.triggerCharacter).toBe("@");

    editor._tiptapEditor.destroy();
  });
});
