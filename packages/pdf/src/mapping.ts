import {
  BlockFromConfigNoChildren,
  BlockNoteSchema,
  BlockSchema,
  InlineContentFromConfig,
  InlineContentSchema,
  StyleSchema,
  Styles,
} from "@blocknote/core";
import { Exporter } from "./Exporter.js";

/**
 * Defines a mapping from all block types with a schema to a result type `R`.
 */
export type BlockMapping<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  RB,
  RI
> = {
  [K in keyof B]: (
    block: BlockFromConfigNoChildren<B[K], I, S>,
    transformer: Exporter<any, any, any, RB, RI, any, any>,
    nestingLevel: number,
    numberedListIndex?: number
  ) => RB | Promise<RB>;
};

/**
 * Defines a mapping from all inline content types with a schema to a result type R.
 */
export type InlineContentMapping<
  I extends InlineContentSchema,
  S extends StyleSchema,
  RI,
  TS
> = {
  [K in keyof I]: (
    inlineContent: InlineContentFromConfig<I[K], S>,
    transformer: Exporter<any, I, S, any, RI, any, TS>
  ) => RI;
};

/**
 * Defines a mapping from all style types with a schema to a result type R.
 */
export type StyleMapping<S extends StyleSchema, RS> = {
  [K in keyof S]: (style: Styles<S>[K]) => RS;
};

/**
 * The mapping factory is a utility function to easily create mappings for
 * a BlockNoteSchema. Using the factory makes it easier to get typescript code completion etc.
 */
export function mappingFactory<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(_schema: BlockNoteSchema<B, I, S>) {
  return {
    createBlockMapping: <R, RI>(mapping: BlockMapping<B, I, S, R, RI>) =>
      mapping,
    createInlineContentMapping: <R, RS>(
      mapping: InlineContentMapping<I, S, R, RS>
    ) => mapping,
    createStyleMapping: <R>(mapping: StyleMapping<S, R>) => mapping,
  };
}
