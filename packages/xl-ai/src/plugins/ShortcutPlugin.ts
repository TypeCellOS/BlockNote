import { BlockNoteEditor } from "@blocknote/core";
import { keymap } from "prosemirror-keymap";
import { Command } from "prosemirror-state";

type AIMenuExtension = {
  store: { state: { aiMenuState: unknown } };
  openAIMenuAtBlock: (blockId: string) => void;
};

// The command that will be executed when the shortcut is pressed.
const openAIMenuCommand = (editor: BlockNoteEditor): Command => {
  return () => {
    const ai = editor.getExtension<AIMenuExtension>("ai");
    if (!ai) {
      return false;
    }

    // Check if the AI Menu is already open. If so, do nothing.
    if (ai.store.state.aiMenuState !== "closed") {
      return false; // Return false to indicate the command did nothing.
    }

    const cursor = editor.getTextCursorPosition();
    if (
      cursor.block.content &&
      Array.isArray(cursor.block.content) && // isarray check not ideal
      cursor.block.content.length === 0 &&
      cursor.prevBlock
    ) {
      ai.openAIMenuAtBlock(cursor.prevBlock.id);
    } else {
      ai.openAIMenuAtBlock(cursor.block.id);
    }

    // Return true to indicate that the key event has been handled.
    return true;
  };
};

// A factory function to create the shortcut plugin.
export const createShortcutPlugin = (editor: BlockNoteEditor) => {
  return keymap({
    // "Mod" maps to "Cmd" on Mac and "Ctrl" on Windows/Linux.
    "Mod-i": openAIMenuCommand(editor),
  });
};
