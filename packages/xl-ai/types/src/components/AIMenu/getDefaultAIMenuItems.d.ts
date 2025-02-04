import { BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import { BlockNoteAIContextValue } from "../BlockNoteAIContext.js";
export type AIMenuSuggestionItem = Omit<DefaultReactSuggestionItem, "onItemClick"> & {
    onItemClick: (setPrompt: (prompt: string) => void) => void;
};
/**
 * Default items we show in the AI Menu when there is no selection active.
 * For example, when the AI menu is triggered via the slash menu
 */
export declare function getDefaultAIMenuItemsWithoutSelection<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, contextValue: BlockNoteAIContextValue): AIMenuSuggestionItem[];
/**
 * Default items we show in the AI Menu when there is a selection active.
 * For example, when the AI menu is triggered via formatting toolbar (AIToolbarButton)
 */
export declare function getDefaultAIMenuItemsWithSelection<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, contextValue: BlockNoteAIContextValue): AIMenuSuggestionItem[];
/**
 * Default items we show in the AI Menu when the AI response is done.
 */
export declare function getDefaultAIActionMenuItems<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, contextValue: BlockNoteAIContextValue): AIMenuSuggestionItem[];
/**
3 examples:

input:
- pass schema / blocks / functions

1) block -> markdown, markdown -> block
2) pass entire document
3) functions (updateBlock, insertBlock, deleteBlock)


response:
- markdown
- entire document (text stream)
- entire document (block call streams)
 *
 */
