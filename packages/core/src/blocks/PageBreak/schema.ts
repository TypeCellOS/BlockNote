import { BlockNoteSchema } from "../BlockNoteSchema.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import {
  createPageBreakBlockConfig,
  createPageBreakBlockSpec,
} from "./block.js";

export * from "./getPageBreakSlashMenuItems.js";

export const pageBreakSchema = BlockNoteSchema.create({
  blockSpecs: {
    pageBreak: createPageBreakBlockSpec(),
  },
});

/**
 * Adds page break support to the given schema.
 */
export const withPageBreak = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema: BlockNoteSchema<B, I, S>,
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
      pageBreak: ReturnType<typeof createPageBreakBlockConfig>;
    },
    I,
    S
  >;
};
