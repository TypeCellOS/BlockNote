import { history, redo, undo } from "@tiptap/pm/history";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const History = createExtension(() => {
  return {
    key: "history",
    prosemirrorPlugins: [history()],
    undoCommand: undo,
    redoCommand: redo,
  } as const;
});
