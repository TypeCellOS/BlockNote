import { redoCommand, undoCommand, yUndoPlugin } from "y-prosemirror";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const YUndoExtension = createExtension(() => {
  return {
    key: "yUndo",
    prosemirrorPlugins: [yUndoPlugin()],
    dependsOn: ["yCursor", "ySync"],
    undoCommand: undoCommand,
    redoCommand: redoCommand,
  } as const;
});
