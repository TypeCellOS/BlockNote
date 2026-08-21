import { afterEach, beforeEach } from "vite-plus/test";

// This setup file also runs for test files that opt into the plain `node`
// environment (`@vitest-environment node`), where there is no `window` at all —
// everything below is a DOM mock, so it is a no-op there.
const hasWindow = typeof window !== "undefined";

beforeEach(() => {
  if (!hasWindow) {
    return;
  }
  (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS = {};
});

afterEach(() => {
  if (!hasWindow) {
    return;
  }
  delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
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
(global as any).ClipboardEvent = ClipboardEventMock;

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

(global as any).DragEvent = DragEventMock;
