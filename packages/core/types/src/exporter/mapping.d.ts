import { BlockNoteSchema } from "../editor/BlockNoteSchema.js";
import { BlockFromConfigNoChildren, BlockSchema, InlineContentFromConfig, InlineContentSchema, StyleSchema, Styles } from "../schema/index.js";
import type { Exporter } from "./Exporter.js";
/**
 * Defines a mapping from all block types with a schema to a result type `R`.
 */
export type BlockMapping<B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema, RB, RI> = {
    [K in keyof B]: (block: BlockFromConfigNoChildren<B[K], I, S>, exporter: Exporter<any, any, any, RB, RI, any, any>, nestingLevel: number, numberedListIndex?: number) => RB | Promise<RB>;
};
/**
 * Defines a mapping from all inline content types with a schema to a result type R.
 */
export type InlineContentMapping<I extends InlineContentSchema, S extends StyleSchema, RI, TS> = {
    [K in keyof I]: (inlineContent: InlineContentFromConfig<I[K], S>, exporter: Exporter<any, I, S, any, RI, any, TS>) => RI;
};
/**
 * Defines a mapping from all style types with a schema to a result type R.
 */
export type StyleMapping<S extends StyleSchema, RS> = {
    [K in keyof S]: (style: Styles<S>[K], exporter: Exporter<any, any, any, any, any, RS, any>) => RS;
};
/**
 * The mapping factory is a utility function to easily create mappings for
 * a BlockNoteSchema. Using the factory makes it easier to get typescript code completion etc.
 */
export declare function mappingFactory<B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(_schema: BlockNoteSchema<B, I, S>): {
    createBlockMapping: <R, RI>(mapping: BlockMapping<B, I, S, R, RI>) => BlockMapping<B, I, S, R, RI>;
    createInlineContentMapping: <R_1, RS>(mapping: InlineContentMapping<I, S, R_1, RS>) => InlineContentMapping<I, S, R_1, RS>;
    createStyleMapping: <R_2>(mapping: StyleMapping<S, R_2>) => StyleMapping<S, R_2>;
};
