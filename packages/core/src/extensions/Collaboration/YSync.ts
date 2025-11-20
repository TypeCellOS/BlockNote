import { ySyncPlugin } from "y-prosemirror";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const YSync = createExtension((_editor, options) => {
  const fragment = options?.collaboration?.fragment;
  if (!fragment) {
    return;
  }

  return {
    key: "ySync",
    plugins: [ySyncPlugin(fragment)],
    runsBefore: ["default"],
  } as const;
});
