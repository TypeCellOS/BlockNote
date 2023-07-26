import { SuggestionItem } from "../../shared/plugins/suggestion/SuggestionItem";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema } from "../Blocks/api/blockTypes";

export type BaseSlashMenuItem<BSchema extends BlockSchema> = SuggestionItem & {
  execute: (editor: BlockNoteEditor<BSchema>) => void;
  aliases: string[];
};
