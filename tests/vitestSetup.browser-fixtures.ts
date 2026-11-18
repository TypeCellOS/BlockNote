import { test } from "./src/fixtures/editor.js";

// Imported Vitest APIs stay unchanged; only global `it` receives these fixtures.
globalThis.it = test;

declare global {
  var it: typeof test;
}
