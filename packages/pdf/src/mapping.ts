import {
  BlockFromConfig,
  BlockNoteSchema,
  BlockSchema,
  InlineContent,
  InlineContentFromConfig,
  InlineContentSchema,
  StyleSchema,
  StyledText,
  Styles,
} from "@blocknote/core";

/**
 * Defines a mapping from all block types with a schema to a result type `R`.
 */
export type BlockMapping<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  R,
  RI
> = {
  [K in keyof B]: (
    block: BlockFromConfig<B[K], I, S>,
    inlineContentTransformer: (
      inlineContent: InlineContent<InlineContentSchema, StyleSchema>[]
    ) => RI,
    nestingLevel: number
  ) => R;
};

/**
 * Defines a mapping from all inline content types with a schema to a result type R.
 */
export type InlineContentMapping<
  I extends InlineContentSchema,
  S extends StyleSchema,
  R,
  RS
> = {
  [K in keyof I]: (
    inlineContent: InlineContentFromConfig<I[K], S>,
    styledTextTransformer: (styledText: StyledText<S>) => RS
  ) => R;
};

/**
 * Defines a mapping from all style types with a schema to a result type R.
 */
export type StyleMapping<S extends StyleSchema, R> = {
  [K in keyof S]: (style: Styles<S>[K]) => R;
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
