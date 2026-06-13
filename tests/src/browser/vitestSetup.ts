import { afterEach, beforeEach } from "vitest";

// Make BlockNote's `UniqueID` extension emit deterministic, incrementing
// numeric IDs instead of UUIDs. Snapshots that pick up auto-generated
// block ids (e.g. a trailing paragraph BlockNote injects after an image
// or heading) stay stable across runs.
beforeEach(() => {
  (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS = {};
});

afterEach(() => {
  delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
});
