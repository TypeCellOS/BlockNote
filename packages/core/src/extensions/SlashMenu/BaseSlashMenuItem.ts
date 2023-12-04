import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { SuggestionItem } from "../../extensions-shared/suggestion/SuggestionItem";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";

export type BaseSlashMenuItem<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = SuggestionItem & {
  execute: (editor: BlockNoteEditor<BSchema, I, S>) => void;
  aliases?: string[];
};
