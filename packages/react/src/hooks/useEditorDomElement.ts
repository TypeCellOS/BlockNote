import { BlockNoteEditor } from "@blocknote/core";

import { useBlockNoteContext } from "../editor/BlockNoteContext.js";
import { useEditorState } from "./useEditorState.js";

// Returns the editor's DOM element reactively.
export function useEditorDOMElement(editor?: BlockNoteEditor<any, any, any>) {
  const editorContext = useBlockNoteContext();
  if (!editor) {
    editor = editorContext?.editor;
  }

  return useEditorState({
    editor,
    selector: (ctx) => ctx.editor?.domElement,
    equalityFn: (a, b) => a === b,
    on: "mount",
  });
}
