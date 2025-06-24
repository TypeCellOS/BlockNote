import { afterEach, beforeEach } from "vitest";

beforeEach(() => {
  globalThis.window = globalThis.window || ({} as any);
  (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS = {};
});

afterEach(() => {
  delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
});
