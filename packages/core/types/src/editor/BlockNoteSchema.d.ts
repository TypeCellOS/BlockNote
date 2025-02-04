import { defaultBlockSpecs, defaultInlineContentSpecs, defaultStyleSpecs } from "../blocks/defaultBlocks.js";
import type { BlockNoDefaults, PartialBlockNoDefaults } from "../schema/blocks/types.js";
import { BlockSchema, BlockSchemaFromSpecs, BlockSpecs, InlineContentSchema, InlineContentSchemaFromSpecs, InlineContentSpecs, StyleSchema, StyleSchemaFromSpecs, StyleSpecs } from "../schema/index.js";
import type { BlockNoteEditor } from "./BlockNoteEditor.js";
export declare class BlockNoteSchema<BSchema extends BlockSchema, ISchema extends InlineContentSchema, SSchema extends StyleSchema> {
    readonly blockSpecs: BlockSpecs;
    readonly inlineContentSpecs: InlineContentSpecs;
    readonly styleSpecs: StyleSpecs;
    readonly blockSchema: BSchema;
    readonly inlineContentSchema: ISchema;
    readonly styleSchema: SSchema;
    readonly BlockNoteEditor: BlockNoteEditor<BSchema, ISchema, SSchema>;
    readonly Block: BlockNoDefaults<BSchema, ISchema, SSchema>;
    readonly PartialBlock: PartialBlockNoDefaults<BSchema, ISchema, SSchema>;
    static create<BSpecs extends BlockSpecs = typeof defaultBlockSpecs, ISpecs extends InlineContentSpecs = typeof defaultInlineContentSpecs, SSpecs extends StyleSpecs = typeof defaultStyleSpecs>(options?: {
        /**
         * A list of custom block types that should be available in the editor.
         */
        blockSpecs?: BSpecs;
        /**
         * A list of custom InlineContent types that should be available in the editor.
         */
        inlineContentSpecs?: ISpecs;
        /**
         * A list of custom Styles that should be available in the editor.
         */
        styleSpecs?: SSpecs;
    }): BlockNoteSchema<BlockSchemaFromSpecs<BSpecs>, InlineContentSchemaFromSpecs<ISpecs>, StyleSchemaFromSpecs<SSpecs>>;
    constructor(opts?: {
        blockSpecs?: BlockSpecs;
        inlineContentSpecs?: InlineContentSpecs;
        styleSpecs?: StyleSpecs;
    });
}
