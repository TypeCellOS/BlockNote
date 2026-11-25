import { testExportParseEqualityBlockNoteHTML } from "./exportParseEqualityTestExecutors.js";
import { exportCases } from "../export/customBlockExportTestInstances.js";
import { registerConversionCases } from "../registerConversionCases.js";

registerConversionCases(
  "Export/parse equality tests (BlockNote HTML)",
  exportCases.filter(({ name }) => name !== "math/basic"),
  testExportParseEqualityBlockNoteHTML,
  true,
);
