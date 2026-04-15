import { useEffect, useState } from "react";

import { useBlockNoteEditor } from "./useBlockNoteEditor.js";
import { useEditorState } from "./useEditorState.js";

/**
 * Returns the editor's DOM element reactively.
 *
 * `editor.domElement` is gated behind TipTap's `isInitialized` flag, which is
 * set in a `setTimeout(0)` after mount. A plain read of `editor.domElement`
 * during the first render (or effect) will see `undefined`, and no transaction
 * fires after `isInitialized` flips to notify subscribers.
 *
 * This hook uses `useEditorState` to pick up changes that coincide with
 * transactions (e.g. remounts), and supplements it with a TipTap `create`
 * event listener to handle the initial mount timing.
 */
export function useEditorDOMElement() {
  const editor = useBlockNoteEditor<any, any, any>();

  // Handle initial mount timing. TipTap sets isInitialized synchronously
  // right after emitting the "create" event, so by the time React processes
  // this state update, editor.domElement is available.
  const [, setInitialized] = useState(!editor.headless);
  useEffect(() => {
    if (!editor.headless) {
      return;
    }
    const handler = () => setInitialized(true);
    editor._tiptapEditor.on("create", handler);
    return () => {
      editor._tiptapEditor.off("create", handler);
    };
  }, [editor]);

  // Re-evaluate editor.domElement on every render (including the one
  // triggered by setInitialized above) and on every transaction.
  return useEditorState({
    editor,
    selector: (ctx) => ctx.editor?.domElement,
    equalityFn: (a, b) => a === b,
  });
}
