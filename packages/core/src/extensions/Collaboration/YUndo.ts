import { redoCommand, undoCommand, yUndoPlugin } from "@y/prosemirror";
import * as Y from "@y/y";
import {
  ExtensionOptions,
  createExtension,
} from "../../editor/BlockNoteExtension.js";
import { CollaborationOptions } from "./Collaboration.js";

export const YUndoExtension = createExtension(
  ({ options }: ExtensionOptions<Pick<CollaborationOptions, "fragment">>) => {
    // In @y/prosemirror v2 the undo plugin no longer creates its own
    // UndoManager - it takes an external one scoped to the collaborative type.
    const undoManager = new Y.UndoManager(options.fragment);
    return {
      key: "yUndo",
      prosemirrorPlugins: [yUndoPlugin(undoManager)],
      dependsOn: ["yCursor", "ySync"],
      undoCommand: undoCommand,
      redoCommand: redoCommand,
    } as const;
  },
);
