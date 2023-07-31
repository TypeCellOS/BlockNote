import { SuggestionItem } from "../../shared/plugins/suggestion/SuggestionItem";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema } from "../Blocks/api/blockTypes";
import { DefaultBlockSchema } from "../Blocks/api/defaultBlocks";

export type BaseSlashMenuItem<
  BSchema extends BlockSchema = DefaultBlockSchema
> = SuggestionItem & {
  execute: (editor: BlockNoteEditor<BSchema>) => void;
  aliases?: string[];
};
