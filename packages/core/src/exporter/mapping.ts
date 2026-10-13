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
 * Each block type maps to either:
 * - a function that renders the block itself. The exporter places the
 *   block's children after it, nested as the format does it; or
 * - `{ withChildren }`, a function that renders the block *and* its
 *   children, which it receives already rendered as its last argument. For
 *   blocks whose children are part of them, like a column or a callout's
 *   body. Container blocks must use it.
 */
export type BlockMapping<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  RB,
  RI,
> = {
  [K in keyof B]:
    | BlockMappingFunction<B[K], I, S, RB, RI>
    | { withChildren: BlockMappingWithChildrenFunction<B[K], I, S, RB, RI> };
};

export type BlockMappingFunction<
  C extends BlockSchema[string],
  I extends InlineContentSchema,
  S extends StyleSchema,
  RB,
  RI,
> = (
  block: BlockFromConfigNoChildren<C, I, S>,
  // we don't know the exact types that are supported by the exporter at this point,
  // because the mapping only knows about converting certain types (which might be a subset of the supported types)
  // this is why there are many `any` types here (same for types below)
  exporter: Exporter<any, any, any, RB, RI, any, any>,
  nestingLevel: number,
  numberedListIndex?: number,
) => RB | Promise<RB>;

/** A `{ withChildren }` mapping: it also receives the block's rendered children. */
export type BlockMappingWithChildrenFunction<
  C extends BlockSchema[string],
  I extends InlineContentSchema,
  S extends StyleSchema,
  RB,
  RI,
> = (
  block: BlockFromConfigNoChildren<C, I, S>,
  exporter: Exporter<any, any, any, RB, RI, any, any>,
  nestingLevel: number,
  numberedListIndex: number | undefined,
  children: Array<Awaited<RB>>,
) => RB | Promise<RB>;

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
    // Deliberately loose on the schema generics, like `BlockMapping` above -
    // otherwise a mapping declared for one schema can't be reused (e.g.
    // spread) in a mapping for a schema with different types.
    exporter: Exporter<any, any, any, any, RI, any, TS>,
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
