import { BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import { BlockNoteAIContextValue } from "../BlockNoteAIContext.js";
/**
 * Returns AI related items that can be added to the slash menu
 */
export declare function getAISlashMenuItems<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, ctx: BlockNoteAIContextValue): DefaultReactSuggestionItem[];
