import App from "@examples/01-basic/testing/src/App";
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
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { ensureTouchEmulation } from "../../utils/ensureTouchEmulation.js";

// On touch devices a tap on a link must not navigate: it is the only way to
// place the caret in the link, and with no hover there would otherwise be no
// path to editing it at all. The tap places the caret, and the selection
// landing inside the link opens the LinkToolbar (which carries an explicit
// open-link action). Desktop click-to-open behavior is covered by the
// comments suite ("second click navigates") on the desktop instances.
const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";
const LINK_TOOLBAR_SELECTOR = ".bn-link-toolbar";

beforeEach(async () => {
  ensureTouchEmulation();
  await page.viewport(393, 727);
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

afterEach(async () => {
  await page.viewport(393, 727);
});

describe("Tapping a link on touch devices", () => {
  test("places the caret and opens the link toolbar instead of navigating", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Tap target");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    // Create the link through the mobile toolbar's popover.
    await page.viewport(393, 427);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    await userEvent.click(
      await waitForSelector(
        `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
      ),
    );
    await vi.waitFor(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement) || active.name !== "url") {
        throw new Error("URL input did not receive focus");
      }
    });
    await userEvent.keyboard("example.com{Enter}");
    const link = await waitForSelector(
      `${EDITOR_SELECTOR} a[href="https://example.com"]`,
    );

    const windowOpen = vi.spyOn(window, "open").mockImplementation(() => null);
    try {
      await userEvent.click(link);

      // The caret lands in the link, which opens the LinkToolbar.
      await waitForSelector(LINK_TOOLBAR_SELECTOR);
      expect(windowOpen).not.toHaveBeenCalled();
    } finally {
      windowOpen.mockRestore();
    }
  });
});
