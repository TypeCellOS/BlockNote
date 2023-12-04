import { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema } from "../../schema/blocks/types";
import { InlineContentSchema } from "../../schema/inlineContent/types";
import { StyleSchema } from "../../schema/styles/types";
import { SuggestionItem } from "../@shared/suggestion/SuggestionItem";

export type BaseSlashMenuItem<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = SuggestionItem & {
  execute: (editor: BlockNoteEditor<BSchema, I, S>) => void;
  aliases?: string[];
};
