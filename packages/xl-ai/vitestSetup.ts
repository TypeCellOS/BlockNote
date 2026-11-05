import { Agent, setGlobalDispatcher } from "undici";
import { afterEach, beforeEach } from "vite-plus/test";
// make sure our fetch request uses HTTP/2
setGlobalDispatcher(
  new Agent({
    allowH2: true,
  }),
);

// https.globalAgent.options.ca = fs.readFileSync(
//   path.join(__dirname, "../xl-ai-server/localhost.pem")
// );
// debugger;
// A test file with `@vitest-environment node` has no window.
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
(global as any).DragEvent = DragEventMock;
