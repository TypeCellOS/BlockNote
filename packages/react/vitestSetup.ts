import { afterEach, beforeEach } from "vite-plus/test";

beforeEach(() => {
  if (typeof window === "undefined") {
    return;
  }
  (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS = {};
});

afterEach(() => {
  if (typeof window === "undefined") {
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
Object.defineProperty(globalThis, "ClipboardEvent", {
  value: ClipboardEventMock,
  configurable: true,
});

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
if (typeof window !== "undefined") {
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

Object.defineProperty(globalThis, "DragEvent", {
  value: DragEventMock,
  configurable: true,
});
