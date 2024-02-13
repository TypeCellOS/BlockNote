import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSchemaFromSpecs,
  BlockSpecs,
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
  StyleSchemaFromSpecs,
  StyleSpecs,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { DependencyList, useMemo, useRef } from "react";

const initEditor = <
  BSpecs extends BlockSpecs,
  ISpecs extends InlineContentSpecs,
  SSpecs extends StyleSpecs
>(
  options: Partial<BlockNoteEditorOptions<BSpecs, ISpecs, SSpecs>>
) => BlockNoteEditor.create(options);

/**
 * Main hook for importing a BlockNote editor into a React project
 */
export const useBlockNote = <
  BSpecs extends BlockSpecs = typeof defaultBlockSpecs,
  ISpecs extends InlineContentSpecs = typeof defaultInlineContentSpecs,
  SSpecs extends StyleSpecs = typeof defaultStyleSpecs
>(
  options: Partial<BlockNoteEditorOptions<BSpecs, ISpecs, SSpecs>> = {},
  deps: DependencyList = []
) => {
  const editorRef =
    useRef<
      BlockNoteEditor<
        BlockSchemaFromSpecs<BSpecs>,
        InlineContentSchemaFromSpecs<ISpecs>,
        StyleSchemaFromSpecs<SSpecs>
      >
    >();

  return useMemo(() => {
    if (editorRef.current) {
      editorRef.current._tiptapEditor.destroy();
    }

    editorRef.current = initEditor(options);
    return editorRef.current!;
  }, deps); //eslint-disable-line react-hooks/exhaustive-deps
};
