import { BlockNoteEditor } from "../../BlockNoteEditor";
import { SuggestionItem } from "../../shared/plugins/suggestion/SuggestionItem";
import { BlockSchema } from "../Blocks/api/blockTypes";
import { InlineContentSchema } from "../Blocks/api/inlineContentTypes";
import { StyleSchema } from "../Blocks/api/styles";

export type BaseSlashMenuItem<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = SuggestionItem & {
  execute: (editor: BlockNoteEditor<BSchema, I, S>) => void;
  aliases?: string[];
};
