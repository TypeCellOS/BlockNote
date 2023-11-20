import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { StyleSchema } from "@blocknote/core/src/extensions/Blocks/api/styles";
import { useEffect } from "react";

export function useEditorContentChange(
  editor: BlockNoteEditor<BlockSchema, StyleSchema>,
  callback: () => void
) {
  useEffect(() => {
    editor._tiptapEditor.on("update", callback);

    return () => {
      editor._tiptapEditor.off("update", callback);
    };
  }, [callback, editor._tiptapEditor]);
}
