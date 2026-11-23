import { afterEach, beforeEach } from "vite-plus/test";

const testHost: typeof globalThis & {
  __TEST_OPTIONS?: { mockID?: number };
} = globalThis;

beforeEach(() => {
  testHost.__TEST_OPTIONS = {};
});

afterEach(() => {
  delete testHost.__TEST_OPTIONS;
});
