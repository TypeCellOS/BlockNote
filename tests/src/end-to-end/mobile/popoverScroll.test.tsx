import App from "@examples/03-ui-components/14-mobile-formatting-toolbar/src/App";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vite-plus/test";
import { render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { waitForSelector } from "../../utils/editor.js";

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";

// Uses the mobile-formatting-toolbar example because it is a realistic page:
// long static text with editors partway down, and two of them. Opening a
// toolbar popover there used to reset the page scroll to the top, taking the
// block being edited off screen entirely — the popover's input autofocused
// while floating-ui had not positioned the popover yet, so the browser's
// scroll-into-view chased it to its pre-positioned spot.

beforeEach(async () => {
  await page.viewport(393, 727);
});

afterEach(async () => {
  await page.viewport(393, 727);
});

describe("Opening a toolbar popover", () => {
  test("does not scroll the page away from the block being edited", async () => {
    await render(<App />);
    await vi.waitFor(() => {
      if (document.querySelectorAll(EDITOR_SELECTOR).length < 2) {
        throw new Error("expected the example's two editors");
      }
    });

    const editor = document.querySelectorAll<HTMLElement>(EDITOR_SELECTOR)[0];
    await userEvent.click(editor.querySelector("p")!);
    await userEvent.keyboard(
      "{Home}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}",
    );

    // "Keyboard opens".
    await page.viewport(393, 427);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    // The example defaults to the pinned scroll-container layout, where that
    // element scrolls rather than the document.
    const scroller =
      document.querySelector(".bn-scroll-container") ??
      document.scrollingElement!;
    const scrollBefore = scroller.scrollTop;
    const editorTopBefore = editor.getBoundingClientRect().top;
    // The regression only shows when the page is actually scrolled.
    expect(scrollBefore).toBeGreaterThan(0);

    await userEvent.click(
      await waitForSelector(
        `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
      ),
    );
    await vi.waitFor(() => {
      if (!document.querySelector('input[name="url"]')) {
        throw new Error("link popover did not open");
      }
    });
    // Let any scroll-into-view settle before measuring.
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(
      Math.abs(scroller.scrollTop - scrollBefore),
      `opening the popover scrolled the page (${scrollBefore} -> ${scroller.scrollTop})`,
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(editor.getBoundingClientRect().top - editorTopBefore),
      "the edited editor moved on screen when the popover opened",
    ).toBeLessThanOrEqual(2);
  });
});
