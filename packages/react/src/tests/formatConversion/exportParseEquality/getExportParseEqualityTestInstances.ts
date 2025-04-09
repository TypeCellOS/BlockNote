import {
  ExportParseEqualityTestCase,
  TestExecutor,
  TestInstance,
} from "@blocknote/core";

import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { getExportTestInstances } from "../export/getExportTestInstances.js";

export const getExportParseEqualityTestInstances = (
  executeTest: TestExecutor<
    ExportParseEqualityTestCase<
      TestBlockSchema,
      TestInlineContentSchema,
      TestStyleSchema
    >,
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >
): TestInstance<
  ExportParseEqualityTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] => getExportTestInstances(executeTest);
