import { ExportParseEqualityTestCase } from "../../../testTypes/formatConversion/exportParseEquality/exportParseEqualityTestCase.js";
import {
  testExportParseEqualityBlockNoteHTML,
  testExportParseEqualityNodes,
} from "../../../testTypes/formatConversion/exportParseEquality/exportParseEqualityTestExecutors.js";
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

export const exportParseEqualityTestInstancesNodes: TestInstance<
  ExportParseEqualityTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = exportParseEqualityTestInstancesBlockNoteHTML.map(({ testCase }) => ({
  testCase,
  executeTest: testExportParseEqualityNodes,
}));
