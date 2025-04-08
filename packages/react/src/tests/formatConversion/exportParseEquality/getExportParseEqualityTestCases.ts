import { ExportParseEqualityTestCase } from "@blocknote/core";

import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { getExportTestCases } from "../export/getExportTestCases.js";

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
