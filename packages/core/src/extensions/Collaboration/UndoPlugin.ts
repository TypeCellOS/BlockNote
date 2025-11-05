import { redoCommand, undoCommand, yUndoPlugin } from "y-prosemirror";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const UndoPlugin = createExtension((editor, options) => {
  if (!options.collaboration) {
    return;
  }

  return {
    key: "yUndoPlugin",
    plugins: [yUndoPlugin({ trackedOrigins: [editor] })],
    dependsOn: ["yCursorPlugin"],
    undoCommand: undoCommand,
    redoCommand: redoCommand,
  } as const;
});
