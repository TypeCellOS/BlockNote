import type {
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
} from "@blocknote/core";
import { addIdsToBlocks } from "@shared/formatConversionTestUtil.js";

import { testOptionsHost } from "../testOptions.js";

export function prepareConversionBlocks<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(source: PartialBlock<B, I, S>[]): PartialBlock<B, I, S>[] {
  (testOptionsHost.__TEST_OPTIONS ??= {}).mockID = 0;

  // Export and round-trip suites reuse the same fixtures. Assign IDs only to
  // the executor's copy, including nested blocks.
  const blocks = structuredClone(source);
  addIdsToBlocks(blocks);
  return blocks;
}
