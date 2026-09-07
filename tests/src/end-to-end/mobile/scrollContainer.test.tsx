import App from "@examples/03-ui-components/14-mobile-formatting-toolbar/src/App";
import { describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { waitForSelector } from "../../utils/editor.js";

// The pinned scroll container keeps the document from moving under the mobile
// toolbar by containing its overscroll, but the browser's pull-to-refresh only
// fires when the overscroll at the top reaches the document. So the
// containment applies to the bottom edge only once the container has scrolled
// (`data-bn-scrolled`, set by `useVirtualKeyboard`); at the top the page can
// still be pulled. Red before that split: `overscroll-behavior: contain` held
// at every scroll position and Safari on iOS never refreshed.
describe("Pinned scroll container", () => {
  test("contains its overscroll only once scrolled away from the top", async () => {
    await render(<App />);
    const container = await waitForSelector(".bn-scroll-container");

    expect(container.hasAttribute("data-bn-scrolled")).toBe(false);
    expect(getComputedStyle(container).overscrollBehaviorY).toBe("auto");

    container.scrollTop = 200;
    await vi.waitFor(() => {
      expect(container.hasAttribute("data-bn-scrolled")).toBe(true);
    });
    expect(getComputedStyle(container).overscrollBehaviorY).toBe("contain");

    container.scrollTop = 0;
    await vi.waitFor(() => {
      expect(container.hasAttribute("data-bn-scrolled")).toBe(false);
    });
    expect(getComputedStyle(container).overscrollBehaviorY).toBe("auto");
  });
});
