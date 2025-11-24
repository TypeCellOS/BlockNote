import { redoCommand, undoCommand, yUndoPlugin } from "y-prosemirror";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const YUndo = createExtension(({ editor }) => {
  return {
    key: "yUndo",
    prosemirrorPlugins: [yUndoPlugin({ trackedOrigins: [editor] })],
    dependsOn: ["yCursor", "ySync"],
    undoCommand: undoCommand,
    redoCommand: redoCommand,
  } as const;
});
