import type { BlockNoteEditor } from "@blocknote/core";
import { useCallback, useEffect, useState } from "react";
import { useBlockNoteEditor } from "./useBlockNoteEditor.js";
import { useEditorSelectionChange } from "./useEditorSelectionChange.js";

export function useEditorSelectionBoundingBox(
  enabled?: boolean,
  editor?: BlockNoteEditor<any, any, any>,
) {
  const ctxEditor = useBlockNoteEditor();
  editor = editor || ctxEditor;

  const [boundingBox, setBoundingBox] = useState(() => {
    if (!enabled) {
      return undefined;
    }

    return editor.getSelectionBoundingBox();
  });

  const cb = useCallback(() => {
    if (!enabled) {
      return;
    }

    const selection = editor.getSelectionBoundingBox();

    setBoundingBox(selection);
  }, [editor, enabled]);

  useEditorSelectionChange(cb, editor, true);

  // initial value when `enabled` changes
  useEffect(() => {
    if (!enabled) {
      setBoundingBox(undefined);
    } else {
      setBoundingBox(editor.getSelectionBoundingBox());
    }
  }, [enabled, editor]);

  return boundingBox;
}
