import { afterEach, beforeEach } from "vite-plus/test";

// Browser-mode setup. Unlike the jsdom `vitestSetup.ts`, we don't mock
// ClipboardEvent/DragEvent/matchMedia here — the real browser provides them.
// We only seed the `window.__TEST_OPTIONS` object that examples read from
// (e.g. the AI example uses `mockID`), replacing the Playwright init script
// that used to live in `src/setup/setupScript.ts`.

beforeEach(() => {
  (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS = {};
});

afterEach(() => {
  delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
});
