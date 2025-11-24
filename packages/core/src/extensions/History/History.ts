import { history, redo, undo } from "@tiptap/pm/history";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const HistoryExtension = createExtension(() => {
  return {
    key: "history",
    prosemirrorPlugins: [history()],
    undoCommand: undo,
    redoCommand: redo,
  } as const;
});
