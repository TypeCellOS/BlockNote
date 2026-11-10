import { afterEach, beforeEach } from "vite-plus/test";

beforeEach(() => {
  if (typeof window !== "undefined") {
    (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS = {};
  }
});

afterEach(() => {
  if (typeof window !== "undefined") {
    delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
  }
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
