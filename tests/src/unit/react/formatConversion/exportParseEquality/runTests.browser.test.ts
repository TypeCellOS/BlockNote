import { testExportParseEqualityBlockNoteHTML } from "../../../shared/formatConversion/exportParseEquality/exportParseEqualityTestExecutors.js";
import { exportCases } from "../export/exportTestInstances.js";
import { registerConversionCases } from "../registerConversionCases.js";

registerConversionCases(
  "Export/parse equality tests (BlockNote HTML)",
  exportCases.filter(({ name }) => name !== "math/basic"),
  testExportParseEqualityBlockNoteHTML,
  true,
);
