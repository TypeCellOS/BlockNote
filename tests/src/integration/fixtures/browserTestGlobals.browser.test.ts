import { expect, vi } from "vite-plus/test";
import {
  installBrowserTestViewport,
  installIOSTouchPoints,
  withBrowserTestGlobals,
} from "../../fixtures/browserTestGlobals.js";

it.for([null, "width=device-width, initial-scale=1"])(
  "restores the original viewport content attribute (%s)",
  (content) => {
    const doc = document.implementation.createHTMLDocument();
    const viewport = doc.createElement("meta");
    viewport.name = "viewport";
    if (content !== null) {
      viewport.setAttribute("content", content);
    }
    doc.head.append(viewport);

    const restore = installBrowserTestViewport(doc);
    expect(viewport.content).toContain("interactive-widget=resizes-content");
    restore?.();

    expect(doc.head.querySelector('meta[name="viewport"]')).toBe(viewport);
    expect(viewport.getAttribute("content")).toBe(content);
  },
);

it("removes only the viewport element it created", () => {
  const doc = document.implementation.createHTMLDocument();
  const restore = installBrowserTestViewport(doc);
  const owned = doc.head.querySelector('meta[name="viewport"]');
  expect(owned).not.toBeNull();
  const unrelated = doc.createElement("meta");
  unrelated.name = "viewport";
  doc.head.prepend(unrelated);

  restore?.();

  expect(
    Array.from(doc.head.querySelectorAll('meta[name="viewport"]')),
  ).toEqual([unrelated]);
});

it("restores a borrowed iOS touch descriptor or reveals the inherited value", () => {
  class Device {
    userAgent = "iPhone";

    get maxTouchPoints() {
      return 0;
    }
  }
  const device = new Device();
  const inherited = new Device();
  const descriptor = {
    get: () => 0,
    enumerable: false,
    configurable: true,
  };
  Object.defineProperty(device, "maxTouchPoints", descriptor);

  const restoreBorrowed = installIOSTouchPoints(device);
  expect(device.maxTouchPoints).toBe(5);
  restoreBorrowed?.();
  expect(Object.getOwnPropertyDescriptor(device, "maxTouchPoints")).toEqual({
    ...descriptor,
    set: undefined,
  });

  const restoreInherited = installIOSTouchPoints(inherited);
  expect(inherited.maxTouchPoints).toBe(5);
  restoreInherited?.();
  expect(Object.hasOwn(inherited, "maxTouchPoints")).toBe(false);
  expect(inherited.maxTouchPoints).toBe(0);
});

it("drains follow-up focus reconciliation before restoring borrowed globals on failure", async () => {
  const optionsKey = "__TEST_OPTIONS";
  const focusKey = "__blockNoteWaitForEditorFocus";
  const keys = [optionsKey, focusKey] as const;
  const previous = keys.map((key) =>
    Object.getOwnPropertyDescriptor(window, key),
  );
  expect(previous[0]?.value).toEqual({});
  expect(previous[1]?.value).toBeTypeOf("function");
  const originalOptions = { mockID: 5 };
  const originalCallback = async () => {};
  const options = {
    configurable: true,
    get: () => originalOptions,
    set: undefined,
    enumerable: false,
  };
  const focus = {
    configurable: true,
    value: originalCallback,
    writable: false,
    enumerable: false,
  };
  const first = document.createElement("div");
  const second = document.createElement("div");
  for (const target of [first, second]) {
    target.className = "bn-editor";
    target.contentEditable = "true";
  }
  const addListener = vi.spyOn(document, "addEventListener");
  const removeListener = vi.spyOn(document, "removeEventListener");
  document.body.append(first, second);
  try {
    Object.defineProperty(window, optionsKey, options);
    Object.defineProperty(window, focusKey, focus);
    const failure = new Error("test failed");
    const reconciled: Element[] = [];
    const dispatchFocus = (target: HTMLElement) =>
      target.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    const run = withBrowserTestGlobals(async () => {
      expect(
        Object.getOwnPropertyDescriptor(window, optionsKey)?.value,
      ).toEqual({});
      const waitForFocus: unknown = Object.getOwnPropertyDescriptor(
        window,
        focusKey,
      )?.value;
      expect(waitForFocus).toBeTypeOf("function");
      expect(waitForFocus).not.toBe(originalCallback);
      // Simulate the editor's 20 ms reconciliation handlers, which run before
      // the fixture's bubbling listener and can in turn move focus.
      first.addEventListener("focusin", () => {
        setTimeout(() => {
          reconciled.push(first);
          dispatchFocus(second);
        }, 20);
      });
      second.addEventListener("focusin", () => {
        setTimeout(() => {
          if (window.__blockNoteWaitForEditorFocus === waitForFocus) {
            reconciled.push(second);
          }
        }, 20);
      });
      dispatchFocus(first);
      throw failure;
    });

    await expect(run).rejects.toBe(failure);

    expect(reconciled).toEqual([first, second]);
    expect(Object.getOwnPropertyDescriptor(window, optionsKey)).toEqual(
      options,
    );
    expect(Object.getOwnPropertyDescriptor(window, focusKey)).toEqual(focus);
    const focusRegistration = addListener.mock.calls.find(
      ([event]) => event === "focusin",
    );
    expect(focusRegistration).toBeDefined();
    expect(removeListener.mock.calls).toContainEqual(focusRegistration);
  } finally {
    first.remove();
    second.remove();
    addListener.mockRestore();
    removeListener.mockRestore();
    for (const [index, key] of keys.entries()) {
      const descriptor = previous[index];
      if (descriptor) {
        Object.defineProperty(window, key, descriptor);
      } else {
        Reflect.deleteProperty(window, key);
      }
    }
  }
});

it("does not enqueue the runner's focus barrier on the test's fake clock", async ({
  onTestFinished,
}) => {
  const editor = document.createElement("div");
  editor.className = "bn-editor";
  editor.contentEditable = "true";
  document.body.append(editor);
  onTestFinished(() => editor.remove());

  let queued: number | undefined;
  await withBrowserTestGlobals(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      editor.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      queued = vi.getTimerCount();
      // Always drain the fake queue so a broken barrier fails the assertion
      // instead of leaving the fixture's teardown stuck.
      vi.runAllTimers();
    } finally {
      vi.useRealTimers();
    }
  });

  expect(queued).toBe(0);
});
