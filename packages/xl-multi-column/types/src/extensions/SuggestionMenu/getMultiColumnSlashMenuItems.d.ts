import { BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import { multiColumnSchema } from "../../blocks/schema.js";
export declare function checkMultiColumnBlocksInSchema<I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<any, I, S>): editor is BlockNoteEditor<typeof multiColumnSchema.blockSchema, I, S>;
export declare function getMultiColumnSlashMenuItems<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>): Omit<DefaultReactSuggestionItem, "key">[];
