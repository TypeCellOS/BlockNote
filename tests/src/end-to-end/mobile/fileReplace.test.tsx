import App from "@examples/01-basic/testing/src/App";
import { afterEach, beforeEach, describe, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { ensureTouchEmulation } from "../../utils/ensureTouchEmulation.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";
const FIRST_URL = "https://placehold.co/100x100.png";
const SECOND_URL = "https://placehold.co/120x120.png";

beforeEach(async () => {
  ensureTouchEmulation();
  await page.viewport(393, 727);
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

afterEach(async () => {
  await page.viewport(393, 727);
});

describe("File replace on mobile", () => {
  test("the replace popover closes once a new file is embedded", async () => {
    await focusOnEditor();

    // Insert at full height first — the standalone file panel doesn't fit in
    // a keyboard-sized viewport.
    await executeSlashCommand("image");
    await userEvent.click(await waitForSelector(`[data-test="embed-tab"]`));
    await userEvent.click(await waitForSelector(`[data-test="embed-input"]`));
    await userEvent.keyboard(FIRST_URL);
    await userEvent.click(
      await waitForSelector(`[data-test="embed-input-button"]`),
    );
    await waitForSelector(`img[src="${FIRST_URL}"]`);

    // "Keyboard opens"; selecting the image block brings up the mobile
    // formatting toolbar with the file buttons.
    await page.viewport(393, 427);
    await userEvent.click(await waitForSelector(`img[src="${FIRST_URL}"]`));
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    await userEvent.click(
      await waitForSelector(
        `${MOBILE_TOOLBAR_SELECTOR} [data-test="replaceFile"]`,
      ),
    );

    // Replace through the popover's embed tab (the panel opens on the Upload
    // tab). Selectors are scoped to the popover so they can never race the
    // identical controls of the standalone insert panel.
    const POPOVER = ".bn-panel-popover";
    await userEvent.click(
      await waitForSelector(`${POPOVER} [data-test="embed-tab"]`),
    );
    await userEvent.click(
      await waitForSelector(`${POPOVER} [data-test="embed-input"]`),
    );
    await userEvent.keyboard(SECOND_URL);
    await userEvent.click(
      await waitForSelector(`${POPOVER} [data-test="embed-input-button"]`),
    );
    await waitForSelector(`img[src="${SECOND_URL}"]`);

    // The popover must close itself: the mobile toolbar stays mounted (unlike
    // desktop), so an uncontrolled popover would linger on top of it and
    // swallow taps on its buttons.
    await vi.waitFor(() => {
      if (document.querySelector(`${POPOVER} [data-test="embed-input"]`)) {
        throw new Error("file replace popover still open after embedding");
      }
      if (!document.querySelector(MOBILE_TOOLBAR_SELECTOR)) {
        throw new Error("mobile toolbar disappeared after replacing the file");
      }
    });
  });
});
