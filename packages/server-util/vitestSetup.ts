import { afterEach, beforeEach } from "vite-plus/test";

// No `window`, as in the Node apps that use this package. The editor reads
// `__TEST_OPTIONS` off `globalThis` when there is no `window`.
beforeEach(() => {
  (globalThis as { __TEST_OPTIONS?: object }).__TEST_OPTIONS = {};
});

afterEach(() => {
  delete (globalThis as { __TEST_OPTIONS?: object }).__TEST_OPTIONS;
});
