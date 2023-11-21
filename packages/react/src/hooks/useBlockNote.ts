import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSchema,
  BlockSpecs,
  InlineContentSchema,
  InlineContentSpecs,
  StyleSchema,
  StyleSpecs,
  defaultBlockSpecs,
  getBlockSchemaFromSpecs,
} from "@blocknote/core";
import { DependencyList, useMemo, useRef } from "react";
import { getDefaultReactSlashMenuItems } from "../SlashMenu/defaultReactSlashMenuItems";

const initEditor = <
  BSpecs extends BlockSpecs,
  ISpecs extends InlineContentSpecs,
  SSpecs extends StyleSpecs,
  BSchema extends BlockSchema = {
    [key in keyof BSpecs]: BSpecs[key]["config"];
  },
  ISchema extends InlineContentSchema = {
    [key in keyof ISpecs]: ISpecs[key]["config"];
  },
  SSchema extends StyleSchema = { [key in keyof SSpecs]: SSpecs[key]["config"] }
>(
  options: Partial<BlockNoteEditorOptions<BSpecs, ISpecs, SSpecs>>
) =>
  BlockNoteEditor.create({
    slashMenuItems: getDefaultReactSlashMenuItems<BSchema, ISchema, SSchema>(
      getBlockSchemaFromSpecs(
        options.blockSpecs || defaultBlockSpecs
      ) as BSchema
    ) as any,
    ...options,
  });

/**
 * Main hook for importing a BlockNote editor into a React project
 */
export const useBlockNote = <
  BSpecs extends BlockSpecs,
  ISpecs extends InlineContentSpecs,
  SSpecs extends StyleSpecs,
  BSchema extends BlockSchema = {
    [key in keyof BSpecs]: BSpecs[key]["config"];
  },
  ISchema extends InlineContentSchema = {
    [key in keyof ISpecs]: ISpecs[key]["config"];
  },
  SSchema extends StyleSchema = { [key in keyof SSpecs]: SSpecs[key]["config"] }
>(
  options: Partial<BlockNoteEditorOptions<BSpecs, ISpecs, SSpecs>> = {},
  deps: DependencyList = []
): BlockNoteEditor<BSchema, ISchema, SSchema> => {
  const editorRef = useRef<BlockNoteEditor<BSchema, ISchema, SSchema>>();

  return useMemo(() => {
    if (editorRef.current) {
      editorRef.current._tiptapEditor.destroy();
    }

    editorRef.current = initEditor(options) as BlockNoteEditor<
      BSchema,
      ISchema,
      SSchema
    >;
    return editorRef.current;
  }, deps); //eslint-disable-line react-hooks/exhaustive-deps
};
