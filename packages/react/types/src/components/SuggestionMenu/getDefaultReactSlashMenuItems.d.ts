import { BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { DefaultReactSuggestionItem } from "./types.js";
export declare function getDefaultReactSlashMenuItems<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>): DefaultReactSuggestionItem[];
