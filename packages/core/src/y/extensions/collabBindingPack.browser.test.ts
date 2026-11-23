import { describe } from "vite-plus/test";

import { registerEmptyDocBindingCases } from "./EmptyDocBinding.browser.test.cases.js";
import { registerYSyncCases } from "./YSync.browser.test.cases.js";
import { registerYSyncRemountCases } from "./YSyncRemount.browser.test.cases.js";
import { registerLegacyYjsDocBindingCases } from "./legacyYjsDocBinding.browser.test.cases.js";
import { registerNestingChangesCases } from "./nestingChanges.browser.test.cases.js";
import { registerTableReshapeCases } from "./tableReshape.browser.test.cases.js";

// Register each original suite separately so its hooks stay local. Only this
// entrypoint is discovered; the case modules also stay out of Core's build.
describe("EmptyDocBinding.browser.test.ts", () => {
  registerEmptyDocBindingCases();
});
describe("YSync.browser.test.ts", () => {
  registerYSyncCases();
});
describe("YSyncRemount.browser.test.ts", () => {
  registerYSyncRemountCases();
});
describe("legacyYjsDocBinding.browser.test.ts", () => {
  registerLegacyYjsDocBindingCases();
});
describe("nestingChanges.browser.test.ts", () => {
  registerNestingChangesCases();
});
describe("tableReshape.browser.test.ts", () => {
  registerTableReshapeCases();
});
