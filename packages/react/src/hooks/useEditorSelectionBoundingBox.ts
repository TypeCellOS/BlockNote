import type { BlockNoteEditor } from "@blocknote/core";
import { useEditorState } from "./useEditorState.js";

/**
 * Returns the bounding box (`DOMRect`) of the current editor selection.
 * Re-renders automatically when the selection changes. Useful for positioning
 * floating UI elements (e.g., toolbars, tooltips) relative to the selection.
 *
 * @param enabled - Whether to compute the bounding box. When `false`, returns
 * `undefined` without measuring.
 * @param editor - The BlockNote editor instance. If omitted, uses the editor
 * from the nearest `BlockNoteContext`.
 * @returns The `DOMRect` of the current selection, or `undefined` if disabled
 * or no selection exists.
 */
export function useEditorSelectionBoundingBox(
  enabled?: boolean,
  editor?: BlockNoteEditor<any, any, any>,
) {
  return useEditorState({
    editor,
    selector: ({ editor }) =>
      enabled ? editor.getSelectionBoundingBox() : undefined,
  });
}
