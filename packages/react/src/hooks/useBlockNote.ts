import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSchema,
  defaultBlockSchema,
  DefaultBlockSchema,
} from "@blocknote/core";
import { DependencyList, useMemo, useRef } from "react";
import { getDefaultReactSlashMenuItems } from "../SlashMenu/defaultReactSlashMenuItems";

const initEditor = <BSchema extends BlockSchema>(
  options: Partial<BlockNoteEditorOptions<BSchema>>
) =>
  new BlockNoteEditor<BSchema>({
    slashMenuItems: getDefaultReactSlashMenuItems<BSchema | DefaultBlockSchema>(
      options.blockSchema || defaultBlockSchema
    ),
    ...options,
  });

/**
 * Main hook for importing a BlockNote editor into a React project
 */
export const useBlockNote = <BSchema extends BlockSchema = DefaultBlockSchema>(
  options: Partial<BlockNoteEditorOptions<BSchema>> = {},
  deps: DependencyList = []
): BlockNoteEditor<BSchema> => {
  const editorRef = useRef<BlockNoteEditor<BSchema>>();

  return useMemo(() => {
    if (editorRef.current) {
      editorRef.current._tiptapEditor.destroy();
    }

    editorRef.current = initEditor(options);
    return editorRef.current;
  }, deps); //eslint-disable-line react-hooks/exhaustive-deps
};
