import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { getExportTestCases } from "../export/getExportTestCases.js";

export type ExportParseEqualityTestCase<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  name: string;
  // At some point we probably want to only have one HTML format that is both
  // lossless when converting to/from blocks, in which case we will only need
  // "html" test cases and can remove "blockNoteHTML".
  conversionType: "blocknoteHTML" | "nodes";
  content: PartialBlock<B, I, S>[];
};

export const getExportParseEqualityTestCases = (
  conversionType: ExportParseEqualityTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >["conversionType"]
): ExportParseEqualityTestCase<
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] =>
  getExportTestCases(conversionType).map(({ name, content }) => ({
    name,
    conversionType,
    content,
  }));
