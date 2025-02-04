import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema/index.js";
import { DefaultGridSuggestionItem } from "./DefaultGridSuggestionItem.js";
export declare function getDefaultEmojiPickerItems<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, query: string): Promise<DefaultGridSuggestionItem[]>;
