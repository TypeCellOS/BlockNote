import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useEffect } from "react";

export function useEditorContentChange(
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
  callback: () => void
) {
  useEffect(() => {
    editor._tiptapEditor.on("update", callback);

    return () => {
      editor._tiptapEditor.off("update", callback);
    };
  }, [callback, editor._tiptapEditor]);
}
