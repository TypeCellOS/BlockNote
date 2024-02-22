import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DependencyList, useMemo } from "react";

/**
 * Main hook for importing a BlockNote editor into a React project
 *
 * TODO: document in docs
 */
export const useCreateBlockNote = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
>(
  options: Partial<BlockNoteEditorOptions<BSchema, ISchema, SSchema>> = {},
  deps: DependencyList = []
) => {
  return useMemo(() => {
    const editor = BlockNoteEditor.create<BSchema, ISchema, SSchema>(options);
    if (window) {
      // for testing / dev purposes
      (window as any).ProseMirror = editor._tiptapEditor;
    }
    return editor;
  }, deps); //eslint-disable-line react-hooks/exhaustive-deps
};

/**
 * @deprecated use useCreateBlockNote instead
 */
export const useBlockNote = useCreateBlockNote;
