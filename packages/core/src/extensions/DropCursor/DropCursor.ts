import { dropCursor } from "prosemirror-dropcursor";
import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { BlockNoteEditorOptions } from "../../editor/BlockNoteEditor.js";

export const DropCursorExtension = createExtension(
  ({
    editor,
    options,
  }: ExtensionOptions<
    Pick<BlockNoteEditorOptions<any, any, any>, "dropCursor">
  >) => {
    return {
      key: "dropCursor",
      prosemirrorPlugins: [
        (options.dropCursor ?? dropCursor)({
          width: 5,
          color: "#ddeeff",
          editor: editor,
        }),
      ],
    } as const;
  },
);
