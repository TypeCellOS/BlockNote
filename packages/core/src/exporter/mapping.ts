import { BlockNoteSchema } from "../blocks/BlockNoteSchema.js";
import {
  BlockFromConfigNoChildren,
  BlockSchema,
  InlineContentFromConfig,
  InlineContentSchema,
  StyleSchema,
  Styles,
} from "../schema/index.js";
import type { Exporter } from "./Exporter.js";

/**
 * Defines a mapping from all block types with a schema to a result type `R`.
 */
export type BlockMapping<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  RB,
  RI,
> = {
  [K in keyof B]: (
    block: BlockFromConfigNoChildren<B[K], I, S>,
    // we don't know the exact types that are supported by the exporter at this point,
    // because the mapping only knows about converting certain types (which might be a subset of the supported types)
    // this is why there are many `any` types here (same for types below)
    exporter: Exporter<any, any, any, RB, RI, any, any>,
    nestingLevel: number,
    numberedListIndex?: number,
    children?: Array<Awaited<RB>>,
  ) => RB | Promise<RB>;
};

/**
 * Defines a mapping from all inline content types with a schema to a result type R.
 */
export type InlineContentMapping<
  I extends InlineContentSchema,
  S extends StyleSchema,
  RI,
  TS,
> = {
  [K in keyof I]: (
    inlineContent: InlineContentFromConfig<I[K], S>,
    exporter: Exporter<any, I, S, any, RI, any, TS>,
  ) => RI;
};

/**
 * Defines a mapping from all style types with a schema to a result type R.
 */
export type StyleMapping<S extends StyleSchema, RS> = {
  [K in keyof S]: (
    style: Styles<S>[K],
    exporter: Exporter<any, any, any, any, any, RS, any>,
  ) => RS;
};

/**
 * The mapping factory is a utility function to easily create mappings for
 * a BlockNoteSchema. Using the factory makes it easier to get typescript code completion etc.
 */
export function mappingFactory<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(_schema: BlockNoteSchema<B, I, S>) {
  return {
    createBlockMapping: <R, RI>(mapping: BlockMapping<B, I, S, R, RI>) =>
      mapping,
    createInlineContentMapping: <R, RS>(
      mapping: InlineContentMapping<I, S, R, RS>,
    ) => mapping,
    createStyleMapping: <R>(mapping: StyleMapping<S, R>) => mapping,
  };
}
