import type { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useRef } from "react";
import { useBlockNoteContext } from "../editor/BlockNoteContext.js";

/**
 * Subscribes to the editor gaining or losing focus. The subscription is
 * automatically cleaned up when the component unmounts, and the latest
 * `callback` is always invoked without resubscribing on re-renders.
 *
 * By default this reports raw content-area focus/blur; `focused: false` may
 * mean focus moved into the editor's own UI (e.g. a toolbar
 * popover's input). Pass `includeEditorUI: true` to instead observe "is the
 * user still interacting with this editor" — floating UI counts as focused,
 * and the callback fires only on settled changes of that combined state.
 *
 * @param callback - Function called with the editor and `{ focused, event }`.
 * @param editor - The BlockNote editor instance. If omitted, uses the editor
 * from the nearest `BlockNoteContext`.
 * @param options - See `editor.onFocusChange`.
 */
export function useEditorFocusChange(
  callback: Parameters<BlockNoteEditor<any, any, any>["onFocusChange"]>[0],
  editor?: BlockNoteEditor<any, any, any>,
  options?: Parameters<BlockNoteEditor<any, any, any>["onFocusChange"]>[1],
) {
  const editorContext = useBlockNoteContext();
  const resolvedEditor = editor ?? editorContext?.editor;

  // Latest-ref pattern: the subscription lives as long as the editor does,
  // while the callback stays current without retriggering the effect.
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  const includeEditorUI = options?.includeEditorUI ?? false;

  useEffect(() => {
    if (!resolvedEditor) {
      throw new Error(
        "'editor' is required, either from BlockNoteContext or as a function argument",
      );
    }

    return resolvedEditor.onFocusChange(
      (editorArg, ctx) => callbackRef.current(editorArg, ctx),
      { includeEditorUI },
    );
  }, [resolvedEditor, includeEditorUI]);
}
