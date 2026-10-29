import { JSDOM } from "jsdom";
import { afterEach, beforeEach } from "vite-plus/test";

// Own one persistent DOM for this test environment, including React's queued
// work between tests. ServerBlockNoteEditor must never replace or close it.
const dom = new JSDOM();
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
});

beforeEach(() => {
  (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS = {};
});

afterEach(() => {
  delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
});
