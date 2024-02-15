import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSpecs,
  InlineContentSpecs,
  StyleSpecs,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { DependencyList, useMemo } from "react";

// TODO: document in docs
export const createBlockNoteEditor = <
  BSpecs extends BlockSpecs,
  ISpecs extends InlineContentSpecs,
  SSpecs extends StyleSpecs
>(
  options: Partial<BlockNoteEditorOptions<BSpecs, ISpecs, SSpecs>>
) => BlockNoteEditor.create(options);

/**
 * Main hook for importing a BlockNote editor into a React project
 *
 * TODO: document in docs
 */
export const useBlockNote = <
  BSpecs extends BlockSpecs = typeof defaultBlockSpecs,
  ISpecs extends InlineContentSpecs = typeof defaultInlineContentSpecs,
  SSpecs extends StyleSpecs = typeof defaultStyleSpecs
>(
  options: Partial<BlockNoteEditorOptions<BSpecs, ISpecs, SSpecs>> = {},
  deps: DependencyList = []
) => {
  return useMemo(() => {
    const editor = createBlockNoteEditor(options);
    if (window) {
      // for testing / dev purposes
      (window as any).ProseMirror = editor._tiptapEditor;
    }
    return editor;
  }, deps); //eslint-disable-line react-hooks/exhaustive-deps
};
