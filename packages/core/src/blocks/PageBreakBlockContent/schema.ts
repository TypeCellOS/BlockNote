import { BlockNoteSchema } from "../../editor/BlockNoteSchema.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { PageBreak } from "./PageBreakBlockContent.js";

export const pageBreakSchema = BlockNoteSchema.create({
  blockSpecs: {
    pageBreak: PageBreak,
  },
});

/**
 * Adds page break support to the given schema.
 */
export const withPageBreak = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  schema: BlockNoteSchema<B, I, S>
) => {
  return BlockNoteSchema.create({
    blockSpecs: {
      ...schema.blockSpecs,
      ...pageBreakSchema.blockSpecs,
    },
    inlineContentSpecs: schema.inlineContentSpecs,
    styleSpecs: schema.styleSpecs,
  }) as any as BlockNoteSchema<
    // typescript needs some help here
    B & {
      pageBreak: typeof PageBreak.config;
    },
    I,
    S
  >;
};
