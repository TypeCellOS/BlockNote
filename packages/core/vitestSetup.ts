import { afterEach, beforeEach } from "vite-plus/test";

// This setup file also runs for test files that opt into the plain `node`
// environment (`@vitest-environment node`), where there is no `window` at
// all. `__TEST_OPTIONS` (which drives deterministic block IDs) is therefore
// set on `window` when there is one and on `globalThis` otherwise, matching
// the resolution `UniqueID`'s `generateID` uses.
const testHost: any = (globalThis as any).window ?? globalThis;

beforeEach(() => {
  testHost.__TEST_OPTIONS = {};
});

afterEach(() => {
  delete testHost.__TEST_OPTIONS;
});

// Mock ClipboardEvent
class ClipboardEventMock extends Event {
  public clipboardData = {
    getData: () => {
      //
    },
    setData: () => {
      //
    },
  };
}
(globalThis as any).ClipboardEvent = ClipboardEventMock;

// Mock DragEvent
class DragEventMock extends Event {
  public dataTransfer = {
    getData: () => {
      //
    },
    setData: () => {
      //
    },
  };
}
(globalThis as any).DragEvent = DragEventMock;
