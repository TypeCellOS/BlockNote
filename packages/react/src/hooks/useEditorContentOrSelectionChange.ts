import type { BlockNoteEditor } from "@blocknote/core";
import { useEditorChange } from "./useEditorChange";
import { useEditorSelectionChange } from "./useEditorSelectionChange";

export function useEditorContentOrSelectionChange(
  callback: () => void,
  editor?: BlockNoteEditor<any, any, any>
) {
  useEditorChange(callback, editor);
  useEditorSelectionChange(callback, editor);
}
