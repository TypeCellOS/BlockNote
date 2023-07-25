import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSchema,
  defaultBlockSchema,
  DefaultBlockSchema,
} from "@blocknote/core";
import { DependencyList } from "react";
import { getDefaultReactSlashMenuItems } from "../SlashMenu/defaultReactSlashMenuItems";

/**
 * Main hook for importing a BlockNote editor into a React project
 */
export const useBlockNote = <BSchema extends BlockSchema = DefaultBlockSchema>(
  options: Partial<BlockNoteEditorOptions<BSchema>> = {},
  _deps: DependencyList = []
) => {
  console.log("create new blocknote instance");

  return new BlockNoteEditor<BSchema>({
    slashCommands: getDefaultReactSlashMenuItems<BSchema | DefaultBlockSchema>(
      options.blockSchema || defaultBlockSchema
    ),
    ...options,
  });
};
