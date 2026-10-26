import { Plugin } from "prosemirror-state";
import { redoCommand, undoCommand, yUndoPlugin } from "y-prosemirror";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const YUndoExtension = createExtension(() => {
  const undoPlugin = yUndoPlugin();
  const historyBoundaryPlugin = new Plugin({
    appendTransaction(transactions, _oldState, newState) {
      // @handlewithcare/prosemirror-inputrules dispatches closeHistory between
      // inserting the literal trigger and applying its conversion. Yjs doesn't
      // read that marker, so otherwise both changes enter the same undo item.
      // prosemirror-history doesn't export the marker's PluginKey; keep this
      // compatibility dependency here, guarded by the history-boundary tests.
      if (transactions.some((tr) => tr.getMeta("closeHistory$"))) {
        undoPlugin.getState(newState)?.undoManager.stopCapturing();
      }
      return null;
    },
  });
  return {
    key: "yUndo",
    prosemirrorPlugins: [undoPlugin, historyBoundaryPlugin],
    dependsOn: ["yCursor", "ySync"],
    undoCommand: undoCommand,
    redoCommand: redoCommand,
  } as const;
});
