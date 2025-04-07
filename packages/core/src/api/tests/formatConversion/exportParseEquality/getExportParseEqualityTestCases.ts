import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { getExportTestCases } from "../export/getExportTestCases.js";

export type ExportParseEqualityTestCase = {
  name: string;
  // At some point we probably want to only have one HTML format that is both
  // lossless when converting to/from blocks, in which case we will only need
  // "html" test cases and can remove "blockNoteHTML".
  conversionType: "blocknoteHTML" | "nodes";
  content: PartialBlock<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >[];
};

export const getExportParseEqualityTestCases = (
  conversionType: ExportParseEqualityTestCase["conversionType"]
): ExportParseEqualityTestCase[] =>
  getExportTestCases(conversionType).map(({ name, content }) => ({
    name,
    conversionType,
    content,
  }));
