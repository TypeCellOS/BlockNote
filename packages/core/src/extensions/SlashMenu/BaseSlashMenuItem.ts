import { BlockNoteEditor } from "../../BlockNoteEditor";
import { SuggestionItem } from "../../shared/plugins/suggestion/SuggestionItem";
import { BlockSchema } from "../Blocks/api/blocks/types";
import { InlineContentSchema } from "../Blocks/api/inlineContent/types";
import { StyleSchema } from "../Blocks/api/styles/types";

export type BaseSlashMenuItem<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = SuggestionItem & {
  execute: (editor: BlockNoteEditor<BSchema, I, S>) => void;
  aliases?: string[];
};
