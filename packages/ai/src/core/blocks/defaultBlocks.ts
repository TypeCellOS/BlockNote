import {
  BlockNoDefaults,
  BlockSchema,
  BlockSpecs,
  InlineContentSchema,
  PartialBlockNoDefaults,
  StyleSchema,
  getBlockSchemaFromSpecs,
  defaultBlockSpecs as defaultCoreBlockSpecs,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "@blocknote/core";

import { AIBlock } from "./AIBlockContent/AIBlockContent";

export const defaultBlockSpecs = {
  ...defaultCoreBlockSpecs,
  ai: AIBlock,
} satisfies BlockSpecs;

export const defaultBlockSchema = getBlockSchemaFromSpecs(defaultBlockSpecs);

// underscore is used that in case a user overrides DefaultBlockSchema,
// they can still access the original default block schema
export type _DefaultBlockSchema = typeof defaultBlockSchema;
export type DefaultBlockSchema = _DefaultBlockSchema;

export type PartialBlock<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = PartialBlockNoDefaults<BSchema, I, S>;

export type Block<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = BlockNoDefaults<BSchema, I, S>;
