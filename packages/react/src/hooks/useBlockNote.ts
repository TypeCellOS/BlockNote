import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSchema,
  DefaultBlockSchema,
} from "@blocknote/core";
import { DependencyList } from "react";
import { defaultReactSlashMenuItems } from "../SlashMenu/defaultReactSlashMenuItems";

/**
 * Main hook for importing a BlockNote editor into a React project
 */
export const useBlockNote = <BSchema extends BlockSchema = DefaultBlockSchema>(
  options: Partial<BlockNoteEditorOptions<BSchema>> = {},
  _deps: DependencyList = []
) => {
  let newOptions: Record<any, any> = {
    slashCommands: defaultReactSlashMenuItems,
    ...options,
  };

  console.log("create new blocknote instance");
  return new BlockNoteEditor<BSchema>(
    newOptions as Partial<BlockNoteEditorOptions<BSchema>>
  );
};
