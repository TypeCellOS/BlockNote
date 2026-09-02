import type { BlockNoteEditor, EditorFocusOptions } from "@blocknote/core";
import { useBlockNoteContext } from "../editor/BlockNoteContext.js";
import { useEditorState } from "./useEditorState.js";

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
    // Thrown during render rather than from an effect: the return value is
    // used to render, so a deferred throw would first paint a frame with a
    // meaningless value.
    throw new Error(
      "'editor' is required, either from BlockNoteContext or as a function argument",
    );
  }

  return useEditorState({
    editor,
    selector: ({ editor }) => editor.isFocused(options),
    on: "focus",
  });
}
