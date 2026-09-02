import type { BlockNoteEditor, EditorFocusOptions } from "@blocknote/core";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { useBlockNoteContext } from "../editor/BlockNoteContext.js";

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

  // The snapshot is the last *settled* value, never a live read. With
  // `includeEditorUI` the editor's own events are already settled, whereas
  // reading focus state during an arbitrary render can catch a mid-handoff
  // frame, where `document.activeElement` is transiently `<body>` and the
  // editor looks unfocused for one frame.
  //
  // The cache is keyed by its inputs: when the editor or the option changes,
  // the settled value belongs to the *old* source, and rendering it would
  // show one wrong frame before the new subscription attaches and re-syncs.
  // Re-reading then is the same live read the first render does.
  const focused = useRef<
    | {
        editor: BlockNoteEditor<any, any, any>;
        includeEditorUI: boolean;
        value: boolean;
      }
    | undefined
  >(undefined);
  if (
    focused.current === undefined ||
    focused.current.editor !== resolvedEditor ||
    focused.current.includeEditorUI !== includeEditorUI
  ) {
    focused.current = {
      editor: resolvedEditor,
      includeEditorUI,
      value: resolvedEditor.isFocused({ includeEditorUI }),
    };
  }

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Re-sync: focus can have changed between the render that produced the
      // current snapshot and this subscription attaching. React does compare
      // the snapshot again after subscribing (its subscribe effect is
      // registered before the consistency-check one), so refreshing the
      // cached value here is enough — but notifying explicitly keeps that
      // independent of React's internal effect ordering.
      focused.current = {
        editor: resolvedEditor,
        includeEditorUI,
        value: resolvedEditor.isFocused({ includeEditorUI }),
      };
      onStoreChange();

      return resolvedEditor.onFocusChange(
        (_editor, ctx) => {
          focused.current = {
            editor: resolvedEditor,
            includeEditorUI,
            value: ctx.focused,
          };
          onStoreChange();
        },
        { includeEditorUI },
      );
    },
    [resolvedEditor, includeEditorUI],
  );

  const getSnapshot = useCallback(() => focused.current!.value, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
