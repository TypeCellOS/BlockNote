import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";

export type ExportTestCase<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  name: string;
  content: PartialBlock<B, I, S>[];
};
