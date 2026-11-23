import { afterEach, beforeEach } from "vite-plus/test";

// Match the Node host that UniqueID uses for deterministic block IDs.
const testHost: typeof globalThis & { __TEST_OPTIONS?: object } = globalThis;

beforeEach(() => {
  testHost.__TEST_OPTIONS = {};
});

afterEach(() => {
  delete testHost.__TEST_OPTIONS;
});
