import App from "@examples/01-basic/testing/src/App";
import { afterEach, beforeEach, describe, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { expectNoNewViolations } from "../../utils/axe.js";
import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { ensureTouchEmulation } from "../../utils/ensureTouchEmulation.js";

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";

beforeEach(async () => {
  ensureTouchEmulation();
  await page.viewport(393, 727);
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

afterEach(async () => {
  await page.viewport(393, 727);
});

// The mobile chrome only exists under touch emulation at a keyboard-sized
// viewport, so these surfaces can't live in the desktop table
// (end-to-end/accessibility/). The known-violations ledger and the assertion
// helper are shared — see utils/axe.ts.
describe("Mobile accessibility (axe)", () => {
  test("editor with the mobile toolbar open", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Accessibility target");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await page.viewport(393, 427);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    await expectNoNewViolations("mobile toolbar open");
  });

  test("link popover open", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Link target");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await page.viewport(393, 427);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    await userEvent.click(
      await waitForSelector(
        `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
      ),
    );
    await vi.waitFor(() => {
      if (!(document.activeElement instanceof HTMLInputElement)) {
        throw new Error("URL input did not receive focus");
      }
    });

    await expectNoNewViolations("link popover open");
  });
});
