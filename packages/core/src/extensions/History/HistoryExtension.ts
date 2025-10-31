import { History } from "@tiptap/extension-history";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { redo, undo } from "@tiptap/pm/history";

export const HistoryExtension = createExtension((_editor, options) => {
  if (options.collaboration) {
    return;
  }

  return {
    key: "history",
    tiptapExtensions: [History],
    undoCommand: undo,
    redoCommand: redo,
  } as const;
});
