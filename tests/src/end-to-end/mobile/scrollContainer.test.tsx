import App from "@examples/03-ui-components/14-mobile-formatting-toolbar/src/App";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { page } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";

const VIEWPORT_WIDTH = 393;
const KEYBOARD_CLOSED = 727;
const KEYBOARD_OPEN = 427;

afterEach(async () => {
  await page.viewport(VIEWPORT_WIDTH, KEYBOARD_CLOSED);
});

// The pinned scroll container keeps the document from moving under the mobile
// toolbar by containing its overscroll, but the browser's pull-to-refresh only
// fires when the overscroll at the top reaches the document. So the
// containment is lifted only at the top with the keyboard closed
// (`data-bn-allow-pull-to-refresh`, set by `useVirtualKeyboard`), so the page
// can still be pulled. Red before that split: `overscroll-behavior: contain` held
// at every scroll position and Safari on iOS never refreshed.
describe("Pinned scroll container", () => {
  test("contains its overscroll only once scrolled away from the top", async () => {
    await render(<App />);
    const container = await waitForSelector(".bn-scroll-container");

    expect(container.hasAttribute("data-bn-allow-pull-to-refresh")).toBe(true);
    expect(getComputedStyle(container).overscrollBehaviorY).toBe("auto");

    container.scrollTop = 200;
    await vi.waitFor(() => {
      expect(container.hasAttribute("data-bn-allow-pull-to-refresh")).toBe(
        false,
      );
    });
    expect(getComputedStyle(container).overscrollBehaviorY).toBe("contain");

    container.scrollTop = 0;
    await vi.waitFor(() => {
      expect(container.hasAttribute("data-bn-allow-pull-to-refresh")).toBe(
        true,
      );
    });
    expect(getComputedStyle(container).overscrollBehaviorY).toBe("auto");
  });

  // With the keyboard up, a pull at the top would start Safari's
  // pull-to-refresh, which shrinks the reported visual viewport mid-pull and
  // makes the container and the toolbar re-pin under the finger (the jitter
  // the containment exists for). Red before the keyboard input to the
  // exception: auto at the top whatever the keyboard did.
  test("contains its overscroll at the top while the keyboard is open", async () => {
    await render(<App />);
    const container = await waitForSelector(".bn-scroll-container");
    expect(getComputedStyle(container).overscrollBehaviorY).toBe("auto");

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await vi.waitFor(() => {
      expect(container.hasAttribute("data-bn-allow-pull-to-refresh")).toBe(
        false,
      );
    });
    expect(getComputedStyle(container).overscrollBehaviorY).toBe("contain");

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_CLOSED);
    await vi.waitFor(() => {
      expect(container.hasAttribute("data-bn-allow-pull-to-refresh")).toBe(
        true,
      );
    });
    expect(getComputedStyle(container).overscrollBehaviorY).toBe("auto");
  });
});
