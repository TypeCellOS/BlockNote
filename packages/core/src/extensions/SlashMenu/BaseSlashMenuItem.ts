import { BlockNoteEditor } from "../../BlockNoteEditor";
import { SuggestionItem } from "../../shared/plugins/suggestion/SuggestionItem";
import { BlockSchema } from "../Blocks/api/blockTypes";
import {
  DefaultBlockSchema,
  DefaultStyleSchema,
} from "../Blocks/api/defaultBlocks";
import { StyleSchema } from "../Blocks/api/styles";

export type BaseSlashMenuItem<
  BSchema extends BlockSchema = DefaultBlockSchema,
  S extends StyleSchema = DefaultStyleSchema
> = SuggestionItem & {
  execute: (editor: BlockNoteEditor<BSchema, S>) => void;
  aliases?: string[];
};
