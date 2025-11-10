import {
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
} from "@blocknote/core";

export type TextCursorPositionTestCase<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = {
  name: string;
  document: PartialBlock<B, I, S>[];
  rangeConfig?: {
    anchor: { id: string; offset: number };
    head: { id: string; offset: number };
  };
};
