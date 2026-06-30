import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
  PartialBlock,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";

import { partialBlocksToBlocksForTesting } from "./formatConversionTestUtil.js";
import { testDocumentBlocks } from "./testDocumentBlocks.js";

// Re-exported so existing imports of `testDocumentBlocks` from this module keep
// working. The data itself lives in the self-contained `testDocumentBlocks.ts`
// so the example generator can copy it verbatim into the playground examples.
export { testDocumentBlocks };

const testDocumentSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageBreak: createPageBreakBlockSpec(),
    column: ColumnBlock,
    columnList: ColumnListBlock,
  },
});

// TODO: Update tests that use this to the new format and remove
export const testDocument = partialBlocksToBlocksForTesting(
  testDocumentSchema,
  // The data is schema-agnostic (PartialBlock<any>); cast to this schema's
  // partial-block type so `testDocument` is fully typed for the exporter tests.
  testDocumentBlocks as PartialBlock<
    typeof testDocumentSchema.blockSchema,
    typeof testDocumentSchema.inlineContentSchema,
    typeof testDocumentSchema.styleSchema
  >[],
);
