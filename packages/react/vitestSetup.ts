import { afterEach, beforeEach } from "vite-plus/test";

// This setup file also runs for test files that opt into the plain `node`
// environment (`@vitest-environment node`), where there is no `window` at
// all. The DOM mocks below are a no-op there.
const hasWindow = typeof window !== "undefined";

// Match the core setup: the deterministic-ID options live on `window` when it
// exists and on `globalThis` in the node environment, since `generateID` reads
// them from `(globalThis.window ?? globalThis).__TEST_OPTIONS`.
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
if (hasWindow) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {
        //
      }, // Deprecated
      removeListener: () => {
        //
      }, // Deprecated
      addEventListener: () => {
        //
      },
      removeEventListener: () => {
        //
      },
      dispatchEvent: () => {
        //
      },
    }),
  });
}

(globalThis as any).DragEvent = DragEventMock;
