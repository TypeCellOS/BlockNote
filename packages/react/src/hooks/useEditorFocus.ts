import type { BlockNoteEditor, EditorFocusOptions } from "@blocknote/core";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { useBlockNoteContext } from "../editor/BlockNoteContext.js";

/**
 * Whether the editor is focused, as state — re-rendering the component when
 * that changes.
 *
 * Use this when focus decides what to *render*.
 * {@link useEditorFocusChange} is the counterpart for running a side effect on
 * focus changes (the same split as `useEditorState` vs `useEditorChange`).
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
    // Thrown during render rather than from an effect: the return value is
    // used to render, so a deferred throw would first paint a frame with a
    // meaningless value.
    throw new Error(
      "'editor' is required, either from BlockNoteContext or as a function argument",
    );
  }

  const includeEditorUI = options?.includeEditorUI ?? false;

  // The snapshot is the last *settled* value, never a live read. With
  // `includeEditorUI` the editor's own events are already settled, whereas
  // reading focus state during an arbitrary render can catch a mid-handoff
  // frame, where `document.activeElement` is transiently `<body>` and the
  // editor looks unfocused for one frame.
  const focused = useRef<boolean>(undefined);
  if (focused.current === undefined) {
    focused.current = resolvedEditor.isFocused({ includeEditorUI });
  }

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Re-sync: focus can have changed between the render that produced the
      // current snapshot and this subscription attaching. React does compare
      // the snapshot again after subscribing (its subscribe effect is
      // registered before the consistency-check one), so refreshing the
      // cached value here is enough — but notifying explicitly keeps that
      // independent of React's internal effect ordering.
      focused.current = resolvedEditor.isFocused({ includeEditorUI });
      onStoreChange();

      return resolvedEditor.onFocusChange(
        (_editor, ctx) => {
          focused.current = ctx.focused;
          onStoreChange();
        },
        { includeEditorUI },
      );
    },
    [resolvedEditor, includeEditorUI],
  );

  const getSnapshot = useCallback(() => focused.current!, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
