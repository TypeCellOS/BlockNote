import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
} from "@blocknote/core";
import { StyleSchema } from "@blocknote/core/src/extensions/Blocks/api/styles";
import { useEffect } from "react";

export function useEditorSelectionChange(
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
  callback: () => void
) {
  useEffect(() => {
    editor._tiptapEditor.on("selectionUpdate", callback);

    return () => {
      editor._tiptapEditor.off("selectionUpdate", callback);
    };
  }, [callback, editor._tiptapEditor]);
}
