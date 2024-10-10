import { BlockMapping, InlineContentMapping } from "./mapping";

import {
  BlockFromConfig,
  BlockSchema,
  InlineContent,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

/*
A transformer transforms a value from type A into type B
*/

/**
 * Creates a simple inline content transformer from a mapping.
 * It simply maps the inline content object through the mapping to the result type.
 */
export const createInlineContentTransformerFromMapping = <
  I extends InlineContentSchema,
  S extends StyleSchema,
  R
>(
  mapping: InlineContentMapping<I, S, R>
) => {
  return (inlineContent: InlineContent<I, S>) => {
    return mapping[inlineContent.type](inlineContent);
  };
};

/**
 * Creates a simple block transformer from a mapping.
 * It simply maps the block object through the mapping to the result type.
 */
export const createBlockTransformerFromMapping = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  R
>(
  mapping: BlockMapping<B, I, S, R>
) => {
  return (block: BlockFromConfig<B[keyof B], I, S>, nestingLevel: number) => {
    return mapping[block.type](block, nestingLevel);
  };
};
