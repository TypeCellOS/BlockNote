import { ExportParseEqualityTestCase } from "../../../shared/formatConversion/exportParseEquality/exportParseEqualityTestCase.js";
import { testExportParseEqualityBlockNoteHTML } from "../../../shared/formatConversion/exportParseEquality/exportParseEqualityTestExecutors.js";
import { TestInstance } from "../../../types.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { exportTestInstancesBlockNoteHTML } from "../export/exportTestInstances.js";

export const exportParseEqualityTestInstancesBlockNoteHTML: TestInstance<
  ExportParseEqualityTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = exportTestInstancesBlockNoteHTML.map(({ testCase }) => ({
  testCase,
  executeTest: testExportParseEqualityBlockNoteHTML,
}));
