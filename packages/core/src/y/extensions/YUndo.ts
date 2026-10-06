import { redoCommand, undoCommand, yUndoPlugin } from "@y/prosemirror";
import { UndoManager } from "@y/y";
import {
  createExtension,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import type { CollaborationOptions } from "./index.js";

export const YUndoExtension = createExtension(
  ({
    editor,
    options,
  }: ExtensionOptions<Pick<CollaborationOptions, "fragment">>) => {
    // The plugin tracks the sync plugin's origin while its view is bound.
    // Editor-origin transactions include changes merged from a fork.
    const undoManager = new UndoManager(options.fragment, {
      trackedOrigins: new Set([editor]),
    });
    editor.on("destroy", () => undoManager.destroy());

    return {
      key: "yUndo",
      prosemirrorPlugins: [yUndoPlugin(undoManager)],
      undoCommand,
      redoCommand,
    } as const;
  },
);
