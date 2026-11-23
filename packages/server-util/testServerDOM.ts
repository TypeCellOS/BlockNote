import { act } from "react";
import { afterAll, aroundEach, beforeAll, beforeEach } from "vite-plus/test";
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
    Object.assign(globalThis, {
      window: document.defaultView,
      document,
    });
  });

  beforeEach(() => {
    Object.assign(window, { __TEST_OPTIONS: {} });
  });

  afterAll(() => {
    try {
      document?.defaultView?.close();
    } finally {
      restoreGlobals?.();
    }
  });
}

/** Own React's scheduled work only in suites that exercise React exports. */
export function useReactServerDOM() {
  useServerDOM();

  aroundEach(async (runTest) => {
    const key = "IS_REACT_ACT_ENVIRONMENT";
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.assign(globalThis, { [key]: true });
    try {
      // React routes scheduled work into act's queue. Await its completion before
      // releasing the DOM, even when the scheduler would need multiple turns.
      await act(runTest);
    } finally {
      if (previous) {
        Object.defineProperty(globalThis, key, previous);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
  });
}
