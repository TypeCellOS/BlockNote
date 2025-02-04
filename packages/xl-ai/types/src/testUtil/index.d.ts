import { BlockNoteEditor, BlockSchema, InlineContentSchema, PartialBlock, StyleSchema } from "@blocknote/core";
export type EditorTestCases<B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> = {
    name: string;
    createEditor: () => BlockNoteEditor<B, I, S>;
    documents: Array<{
        name: string;
        blocks: PartialBlock<NoInfer<B>, NoInfer<I>, NoInfer<S>>[];
    }>;
};
