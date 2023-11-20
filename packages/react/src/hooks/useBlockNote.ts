import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSchema,
  BlockSpecs,
  defaultBlockSpecs,
} from "@blocknote/core";
import {
  StyleSchema,
  StyleSpecs,
} from "@blocknote/core/src/extensions/Blocks/api/styles";
import { DependencyList, useMemo, useRef } from "react";
import { getDefaultReactSlashMenuItems } from "../SlashMenu/defaultReactSlashMenuItems";

const initEditor = <
  BSpecs extends BlockSpecs,
  SSpecs extends StyleSpecs,
  BSchema extends BlockSchema = {
    [key in keyof BSpecs]: BSpecs[key]["config"];
  },
  SSchema extends StyleSchema = { [key in keyof SSpecs]: SSpecs[key]["config"] }
>(
  options: Partial<BlockNoteEditorOptions<BSpecs, SSpecs>>
) =>
  BlockNoteEditor.create({
    slashMenuItems: getDefaultReactSlashMenuItems<BSchema, SSchema>(
      options.blockSpecs || (defaultBlockSpecs as any)
    ),
    ...options,
  });

/**
 * Main hook for importing a BlockNote editor into a React project
 */
export const useBlockNote = <
  BSpecs extends BlockSpecs,
  SSpecs extends StyleSpecs,
  BSchema extends BlockSchema = {
    [key in keyof BSpecs]: BSpecs[key]["config"];
  },
  SSchema extends StyleSchema = { [key in keyof SSpecs]: SSpecs[key]["config"] }
>(
  options: Partial<BlockNoteEditorOptions<BSpecs, SSpecs>> = {},
  deps: DependencyList = []
): BlockNoteEditor<BSchema, SSchema> => {
  const editorRef = useRef<BlockNoteEditor<BSchema, SSchema>>();

  return useMemo(() => {
    if (editorRef.current) {
      editorRef.current._tiptapEditor.destroy();
    }

    editorRef.current = initEditor(options) as BlockNoteEditor<
      BSchema,
      SSchema
    >;
    return editorRef.current;
  }, deps); //eslint-disable-line react-hooks/exhaustive-deps
};
