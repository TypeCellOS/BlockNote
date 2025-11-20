import { history, redo, undo } from "@tiptap/pm/history";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const History = createExtension((_editor, options) => {
  if (options.collaboration) {
    return;
  }

  return {
    key: "history",
    plugins: [history()],
    undoCommand: undo,
    redoCommand: redo,
  } as const;
});
