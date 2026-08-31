import App from "@examples/01-basic/testing/src/App";
import { afterEach, beforeEach, describe, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { ensureTouchEmulation } from "../../utils/ensureTouchEmulation.js";

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";
const LINK_POPOVER_SELECTOR = ".bn-form-popover";

// Runs in the "android" browser instance (Android UA + touch emulation at
// context level — see vite.config.browser.ts), so `isTouchDevice()` is
// genuinely true. The on-screen keyboard is emulated by resizing the
// viewport: `useVirtualKeyboard` treats a >150px height drop as the keyboard
// opening — which is exactly how a real keyboard manifests with
// `interactive-widget=resizes-content`. The extra ±60px step mimics Gboard
// showing its suggestion strip when focus moves into an input: the resize
// that used to make Mantine's `hideDetached` hide the link popover, blurring
// its focused input and collapsing the keyboard, toolbar, and popover (the
// Android Chrome bug behind PR #2982).
const VIEWPORT_WIDTH = 393;
const KEYBOARD_CLOSED = 727;
const KEYBOARD_OPEN = 427;
const KEYBOARD_OPEN_WITH_SUGGESTION_STRIP = 367;

// Lets a viewport resize propagate: the resize event, the floating-ui
// autoUpdate pass it triggers, and React's commit each take a frame.
async function settleFrames(count = 3) {
  for (let i = 0; i < count; i++) {
    await new Promise(requestAnimationFrame);
  }
}

function activeUrlInput() {
  const active = document.activeElement;
  return active instanceof HTMLInputElement && active.name === "url"
    ? active
    : undefined;
}

beforeEach(async () => {
  ensureTouchEmulation();
  await page.viewport(VIEWPORT_WIDTH, KEYBOARD_CLOSED);
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

afterEach(async () => {
  await page.viewport(VIEWPORT_WIDTH, KEYBOARD_CLOSED);
});

describe("Mobile formatting toolbar", () => {
  test("shows while the virtual keyboard is open and hides when it closes", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Mobile toolbar");

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_CLOSED);
    await vi.waitFor(() => {
      if (document.querySelector(MOBILE_TOOLBAR_SELECTOR)) {
        throw new Error(
          "mobile toolbar still visible after the keyboard closed",
        );
      }
    });
  });

  test("link popover holds focus through keyboard resizes and creates the link", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Link target");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    await userEvent.click(
      await waitForSelector(
        `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
      ),
    );

    // The URL input autofocuses when the popover opens.
    await vi.waitFor(() => {
      if (!activeUrlInput()) {
        throw new Error("URL input did not receive focus on popover open");
      }
    });

    // Android's IME picks the Enter key's action itself, and picks "Next"
    // whenever anything focusable follows the popover — advancing focus into
    // the next editor on the page rather than dispatching Enter, so the
    // submit handler never runs and no link is created. `enterkeyhint` is
    // what tells it to report Enter instead.
    if (activeUrlInput()!.getAttribute("enterkeyhint") !== "done") {
      throw new Error(
        "URL input must set enterkeyhint, or Android's IME turns Enter into " +
          "a focus-advance instead of a submit",
      );
    }

    // iOS Safari auto-zooms the page when an input with a computed font-size
    // under 16px takes focus, and that zoom perturbs the visual viewport the
    // toolbar positions itself from. Emulation can't reproduce the zoom
    // itself (it's device behaviour, not engine behaviour — the real-device
    // suite asserts visualViewport.scale directly), so this guards the CSS
    // contract that prevents it.
    {
      const fontSize = parseFloat(getComputedStyle(activeUrlInput()!).fontSize);
      if (fontSize < 16) {
        throw new Error(
          `URL input font-size is ${fontSize}px; iOS Safari auto-zooms below ` +
            `16px (see the pointer:coarse rule in blocknoteStyles.css)`,
        );
      }
    }

    // Focusing an input makes the keyboard show its suggestion strip, then
    // settle back. The focused input must survive both resizes.
    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN_WITH_SUGGESTION_STRIP);
    await settleFrames();
    if (!activeUrlInput()) {
      throw new Error("URL input lost focus when the suggestion strip resized");
    }

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await settleFrames();
    if (!activeUrlInput()) {
      throw new Error(
        "URL input lost focus when the suggestion strip resize settled",
      );
    }

    await userEvent.keyboard("example.com");
    await userEvent.keyboard("{Enter}");

    await waitForSelector(`${EDITOR_SELECTOR} a[href="https://example.com"]`);

    // Submitting closes the popover but leaves the toolbar up: on mobile the
    // toolbar stays mounted (unlike desktop, which unmounts it and the popover
    // with it), so the popover must close itself — the lingering popover
    // otherwise covers the toolbar and swallows taps on its buttons.
    await vi.waitFor(() => {
      if (document.querySelector(LINK_POPOVER_SELECTOR)) {
        throw new Error("link popover still open after submitting");
      }
      if (!document.querySelector(MOBILE_TOOLBAR_SELECTOR)) {
        throw new Error("mobile toolbar disappeared after submitting a link");
      }
    });

    // Reopening the popover with the whole link selected must pre-fill its
    // URL: `getSelectedLinkUrl` reads the mark just inside the selection
    // start, since a lookup exactly at the link's left boundary misses it.
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");
    await userEvent.click(
      await waitForSelector(
        `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
      ),
    );
    await vi.waitFor(() => {
      const input = activeUrlInput();
      if (input?.value !== "https://example.com") {
        throw new Error(
          `URL input not pre-filled for a fully selected link (value: ${JSON.stringify(input?.value)})`,
        );
      }
    });
  });
});
