import { BlockFromConfig, BlockNoteSchema, BlockSchema, InlineContent, InlineContentSchema, StyleSchema, StyledText, Styles } from "@blocknote/core";
import { BlockMapping, InlineContentMapping, StyleMapping } from "./mapping.js";
export declare abstract class Transformer<B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema, RB, RI, RS, TS> {
    readonly mappings: {
        blockMapping: BlockMapping<B, I, S, RB, RI>;
        inlineContentMapping: InlineContentMapping<I, S, RI, TS>;
        styleMapping: StyleMapping<S, RS>;
    };
    constructor(_schema: BlockNoteSchema<B, I, S>, // only used for type inference
    mappings: {
        blockMapping: BlockMapping<B, I, S, RB, RI>;
        inlineContentMapping: InlineContentMapping<I, S, RI, TS>;
        styleMapping: StyleMapping<S, RS>;
    });
    mapStyles(styles: Styles<S>): RS[];
    mapInlineContent(inlineContent: InlineContent<I, S>): RI;
    transformInlineContent(inlineContentArray: InlineContent<I, S>[]): RI[];
    abstract transformStyledText(styledText: StyledText<S>): TS;
    mapBlock(block: BlockFromConfig<B[keyof B], I, S>, nestingLevel: number, numberedListIndex: number): RB;
}
