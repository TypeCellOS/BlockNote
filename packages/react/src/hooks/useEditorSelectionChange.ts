import type { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useRef } from "react";
import { useIsomorphicLayoutEffect } from "../util/useIsomorphicLayoutEffect.js";
import { useBlockNoteContext } from "../editor/BlockNoteContext.js";

/**
 * Subscribes to editor selection changes. The callback is invoked whenever the
 * user's cursor position or text selection changes, and the subscription is
 * automatically cleaned up when the component unmounts. The latest `callback` is always the one
 * invoked — passing a new callback identity does not resubscribe.
 *
 * @param callback - Function called when the selection changes.
 * @param editor - The BlockNote editor instance. If omitted, uses the editor
 * from the nearest `BlockNoteContext`.
 * @param includeSelectionChangedByRemote - Whether to also fire the callback
 * when the selection is changed by a remote collaborator. Defaults to `false`.
 */
export function useEditorSelectionChange(
  callback: () => void,
  editor?: BlockNoteEditor<any, any, any>,
  includeSelectionChangedByRemote?: boolean,
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
    return editor.onSelectionChange(
      // The declared callback type takes no arguments, but the subscription
      // has always passed the editor — keep forwarding it so untyped callers
      // that used it don't break.
      (editorArg) =>
        (callbackRef.current as (e?: typeof editorArg) => void)(editorArg),
      includeSelectionChangedByRemote,
    );
  }, [editor, includeSelectionChangedByRemote]);
}
