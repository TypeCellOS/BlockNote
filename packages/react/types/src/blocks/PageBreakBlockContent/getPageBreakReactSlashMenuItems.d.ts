import { BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { DefaultReactSuggestionItem } from "../../components/SuggestionMenu/types.js";
export declare function getPageBreakReactSlashMenuItems<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>): (Omit<DefaultReactSuggestionItem, "key"> & {
    key: "page_break";
})[];
