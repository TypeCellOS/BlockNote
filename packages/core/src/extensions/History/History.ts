import { history, redo, undo } from "@tiptap/pm/history";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { suggestChanges } from "@handlewithcare/prosemirror-suggest-changes";

export const HistoryExtension = createExtension(() => {
  return {
    key: "history",
    prosemirrorPlugins: [history(), suggestChanges()],
    undoCommand: undo,
    redoCommand: redo,
  } as const;
});
