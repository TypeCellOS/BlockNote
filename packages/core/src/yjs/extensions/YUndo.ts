import { Plugin } from "prosemirror-state";
import { redoCommand, undoCommand, yUndoPlugin } from "y-prosemirror";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const YUndoExtension = createExtension(() => {
  const undoPlugin = yUndoPlugin();
  const historyBoundaryPlugin = new Plugin({
    view(view) {
      // y-prosemirror destroys its state-owned manager with its plugin view:
      // https://github.com/yjs/y-prosemirror/issues/114. Reconnect it when views
      // are recreated with retained state (remounts or plugin-array changes).
      // Keep upstream destroy intact to clean up old view callbacks and reset
      // managers; a no-op destroy would leak both. Resetting state loses history.
      const undoManager = undoPlugin.getState(view.state)?.undoManager;
      if (!undoManager) {
        throw new Error("Missing Yjs undo plugin state");
      }
      undoManager.trackedOrigins.add(undoManager); // Required to capture redo.
      undoManager.doc.on(
        "afterTransaction",
        undoManager.afterTransactionHandler,
      );
      // oxlint-disable-next-line typescript/unbound-method -- Yjs binds destroy in its constructor.
      undoManager.doc.on("destroy", undoManager.destroy);
      return {};
    },
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
