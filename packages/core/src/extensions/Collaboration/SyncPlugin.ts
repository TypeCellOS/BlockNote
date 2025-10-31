import { ySyncPlugin } from "y-prosemirror";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const SyncPlugin = createExtension((_editor, options) => {
  const fragment = options?.collaboration?.fragment;
  if (!fragment) {
    return;
  }

  return {
    key: "ySyncPlugin",
    plugins: [ySyncPlugin(fragment)],
    dependsOn: ["yCursorPlugin", "yUndoPlugin"],
  } as const;
});
