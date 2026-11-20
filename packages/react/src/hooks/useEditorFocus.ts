import type { BlockNoteEditor, EditorFocusOptions } from "@blocknote/core";
import { useMemo, useSyncExternalStore } from "react";
import { useBlockNoteContext } from "../editor/BlockNoteContext.js";

function createFocusStore(
  editor: BlockNoteEditor<any, any, any>,
  includeEditorUI: boolean,
) {
  let focused = editor.isFocused({ includeEditorUI });
  function getSnapshot() {
    return focused;
  }
  function subscribe(onStoreChange: () => void) {
    const unsubscribe = editor.onFocusChange(
      (_editor, ctx) => {
        focused = ctx.focused;
        onStoreChange();
      },
      { includeEditorUI },
    );
    focused = editor.isFocused({ includeEditorUI });
    onStoreChange();
    return unsubscribe;
  }
  return { getSnapshot, subscribe };
}

/**
 * Whether the editor is focused, as state — re-rendering the component when
 * that changes.
 *
 * Use this when focus decides what to *render*; for running a side effect on
 * focus changes, subscribe directly with `editor.onFocusChange`.
 *
 * By default this reports raw content-area focus, so `false` may just mean
 * focus moved into the editor's own UI — a toolbar popover's input, say. Pass
 * `includeEditorUI: true` to instead get "is the user still interacting with
 * this editor", which counts toolbars, menus and popovers as focused and only
 * changes once focus movement has settled.
 *
 * @param options - See `editor.onFocusChange`.
 * @param editor - The BlockNote editor instance. If omitted, uses the editor
 * from the nearest `BlockNoteContext`.
 */
export function useEditorFocus(
  options?: EditorFocusOptions,
  editor?: BlockNoteEditor<any, any, any>,
): boolean {
  const editorContext = useBlockNoteContext();
  const resolvedEditor = editor ?? editorContext?.editor;

  if (!resolvedEditor) {
    throw new Error(
      "'editor' is required, either from BlockNoteContext or as a function argument",
    );
  }

  const includeEditorUI = options?.includeEditorUI ?? false;

  // Keep the last settled event value, not live DOM focus during a handoff.
  // Each source owns its snapshot, including when the editor/option changes.
  const store = useMemo(
    () => createFocusStore(resolvedEditor, includeEditorUI),
    [resolvedEditor, includeEditorUI],
  );

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
