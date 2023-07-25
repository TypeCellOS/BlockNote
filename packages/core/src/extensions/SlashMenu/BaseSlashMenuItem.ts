import { SuggestionItem } from "../../shared/plugins/suggestion/SuggestionItem";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema } from "../Blocks/api/blockTypes";

export type BaseSlashMenuItem<BSchema extends BlockSchema> = SuggestionItem & {
  execute: (editor: BlockNoteEditor<BSchema>) => void;
  aliases: string[];
};

export function createBaseSlashMenuItem<BSchema extends BlockSchema>(
  name: string,
  execute: (editor: BlockNoteEditor<BSchema>) => void,
  aliases: string[] = []
): BaseSlashMenuItem<BSchema> {
  return {
    name,
    execute,
    aliases,
    match: (query: string): boolean => {
      return (
        name.toLowerCase().startsWith(query.toLowerCase()) ||
        aliases.filter((alias) =>
          alias.toLowerCase().startsWith(query.toLowerCase())
        ).length !== 0
      );
    },
  };
}
