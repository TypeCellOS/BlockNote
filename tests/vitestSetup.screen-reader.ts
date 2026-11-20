import { test } from "./src/fixtures/editor.screen-reader.js";

globalThis.it = test;

declare global {
  var it: typeof test;
}
