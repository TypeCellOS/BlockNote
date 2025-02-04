import { Block, BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
export declare function useSelectedBlocks<BSchema extends BlockSchema, ISchema extends InlineContentSchema, SSchema extends StyleSchema>(editor?: BlockNoteEditor<BSchema, ISchema, SSchema>): Block<BSchema, ISchema, SSchema>[];
