import { createElement, useLayoutEffect } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { aroundAll, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react/pure";

describe("React renderer cleanup", { shuffle: false }, () => {
  const suiteHost = document.createElement("div");
  let testHost: HTMLElement | undefined;
  let disposals = 0;

  aroundAll(async (runSuite) => {
    document.body.append(suiteHost);
    const root = createRoot(suiteHost);
    try {
      flushSync(() => root.render(createElement("p", null, "suite content")));
      await runSuite();
    } finally {
      root.unmount();
      suiteHost.remove();
    }
  });

  function TestComponent() {
    useLayoutEffect(
      () => () => {
        disposals++;
      },
      [],
    );
    return createElement("p", null, "test content");
  }

  test.fails("ends a failed attempt with a rendered component", async () => {
    const view = await render(createElement(TestComponent));
    testHost = view.container;
    throw new Error("Intentional test failure");
  });

  test("unmounts the failed attempt without touching the suite root", () => {
    expect(testHost?.isConnected).toBe(false);
    expect(disposals).toBe(1);
    expect(suiteHost.textContent).toBe("suite content");
  });
});
