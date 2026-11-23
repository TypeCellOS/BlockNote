import { setImmediate } from "node:timers/promises";
import { afterAll, beforeAll, beforeEach } from "vite-plus/test";
import { getDocument } from "./src/dom.js";

/** Opt in only when exercising the production server DOM contract. */
export function useServerDOM() {
  const keys = ["window", "document"] as const;
  let restoreGlobals: (() => void) | undefined;
  let document: Document | undefined;

  beforeAll(() => {
    const previous = keys.map((key) => ({
      key,
      descriptor: Object.getOwnPropertyDescriptor(globalThis, key),
    }));
    restoreGlobals = () => {
      for (const { key, descriptor } of previous) {
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor);
        } else {
          Reflect.deleteProperty(globalThis, key);
        }
      }
    };
    document = getDocument();
    Object.assign(globalThis, { window: document.defaultView, document });
  });

  beforeEach(() => {
    Object.assign(window, { __TEST_OPTIONS: {} });
  });

  afterAll(async () => {
    try {
      // React's Node scheduler posts immediate callbacks during exports and
      // unmounts. Let queued callbacks run with the application DOM still live.
      await setImmediate();
      document?.defaultView?.close();
    } finally {
      restoreGlobals?.();
    }
  });
}
