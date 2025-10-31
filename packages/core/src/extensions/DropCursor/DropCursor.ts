import { dropCursor } from "prosemirror-dropcursor";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const DropCursor = createExtension((editor, options) => {
  return {
    key: "dropCursor",
    plugins: [
      (options.dropCursor ?? dropCursor)({
        width: 5,
        color: "#ddeeff",
        editor: editor,
      }),
    ],
  } as const;
});
