import type { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useRef } from "react";
import { useIsomorphicLayoutEffect } from "../util/useIsomorphicLayoutEffect.js";
import { useBlockNoteContext } from "../editor/BlockNoteContext.js";

/**
 * Subscribes to editor content changes. The callback is invoked whenever the
 * editor's document is modified, and the subscription is automatically cleaned
 * up when the component unmounts.
 *
 * @param callback - Function called when the editor content changes.
 * @param editor - The BlockNote editor instance. If omitted, uses the editor
 * from the nearest `BlockNoteContext`.
 */
export function useEditorChange(
  callback: Parameters<BlockNoteEditor<any, any, any>["onChange"]>[0],
  editor?: BlockNoteEditor<any, any, any>,
) {
  const editorContext = useBlockNoteContext();
  if (!editor) {
    editor = editorContext?.editor;
  }

  // Latest-ref pattern: the subscription lives as long as the editor does,
  // while the callback stays current without resubscribing on re-renders.
  const callbackRef = useRef(callback);
  // Layout-effect timing, not passive: a layout effect elsewhere can
  // trigger an editor event right after commit, and the subscription must
  // not invoke the previous render's callback then.
  useIsomorphicLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!editor) {
      throw new Error(
        "'editor' is required, either from BlockNoteContext or as a function argument",
      );
    }

    return editor.onChange((...args: Parameters<typeof callback>) =>
      callbackRef.current(...args),
    );
  }, [editor]);
}
