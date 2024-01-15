import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor";

export type SuggestionItem<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  name: string;
  execute: (editor: BlockNoteEditor<BSchema, I, S>) => void;
  aliases?: string[];
};
