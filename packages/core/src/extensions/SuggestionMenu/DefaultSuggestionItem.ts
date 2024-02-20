import { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "../../blocks/defaultBlocks";

export type DefaultSuggestionItem<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = {
  title: string;
  onItemClick: (editor: BlockNoteEditor<BSchema, I, S>) => void;
  subtext?: string;
  badge?: string;
  aliases?: string[];
  group?: string;
};
