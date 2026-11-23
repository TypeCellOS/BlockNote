import type {} from "./src/commands/transport/keyboard.js";
import { afterEach, aroundAll, beforeEach } from "vite-plus/test";
import { installBrowserTestStyles } from "./src/commands/browser/installBrowserTestStyles.js";
import { commands, page } from "./src/commands/transport.js";

import {
  ensureTouchEmulation,
  hasTouchEmulation,
} from "./src/utils/ensureTouchEmulation.js";

// Browser-mode setup. Unlike the jsdom `vitestSetup.ts`, we don't mock
// ClipboardEvent/DragEvent/matchMedia here — the real browser provides them.
// We only seed the `window.__TEST_OPTIONS` object that examples read from
// (e.g. the AI example uses `mockID`), replacing the Playwright init script
// that used to live in `src/setup/setupScript.ts`.

// Size the test iframe to 1280x720. The playwright `contextOptions.viewport`
// in vite.config.browser.ts sizes the OUTER browser window, but vitest renders
// each test inside an iframe that defaults to a much smaller size (~333px wide
// — narrow enough to wrap menus weirdly and skew screenshots). `page.viewport`
// resizes that iframe. Run before all tests in the file so every test sees the
// right size from the first render.
aroundAll(async (runSuite) => {
  // On the android and ios instances the outer window is a 393x727 phone
  // (provider contextOptions) — the iframe must match it exactly. A larger
  // iframe gets scaled down by the harness's fit-to-window transform, so
  // captures come out phone-*sized* but contain a shrunken desktop-width
  // layout.
  if (/android|iphone/i.test(navigator.userAgent)) {
    await page.viewport(393, 727);
  } else {
    await page.viewport(1280, 720);
  }

  const removeStyles = installBrowserTestStyles();
  try {
    await runSuite();
  } finally {
    removeStyles();
  }
});

// Chromium drops the context's touch emulation after any screenshot captured
// beyond the viewport, which on this mobile context is every element
// screenshot, and Playwright never re-arms it (microsoft/playwright#42607;
// mechanism and repro in `src/commands/transport/restoreTouchEmulation.ts`).
// Check in the iframe before crossing into Node to re-arm it. If restoration
// is needed, assert it actually worked instead of silently testing without touch.
beforeEach(async () => {
  if (/android/i.test(navigator.userAgent) && !hasTouchEmulation()) {
    await commands.restoreTouchEmulation();
    ensureTouchEmulation();
  }
  // Playwright's WebKit emulation sets `(pointer: coarse)` and `ontouchstart`
  // for `hasTouch` but leaves `navigator.maxTouchPoints` at 0, which
  // `isTouchDevice()` requires; real iOS Safari reports 5. The one stub of
  // the ios instance.
  if (/iphone/i.test(navigator.userAgent) && navigator.maxTouchPoints === 0) {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5 });
    ensureTouchEmulation();
  }
});

beforeEach(() => {
  (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS = {};
});

afterEach(() => {
  delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
});

let pendingEditorFocus = Promise.resolve();

async function waitForEditorFocus() {
  let pending;
  do {
    pending = pendingEditorFocus;
    await pending;
  } while (pending !== pendingEditorFocus);
}

// Provider commands run in Node and await this function inside the test iframe.
window.__blockNoteWaitForEditorFocus = waitForEditorFocus;

function onEditorFocus(event: FocusEvent) {
  if (
    event.target instanceof HTMLElement &&
    event.target.matches('.bn-editor[contenteditable="true"]')
  ) {
    // ProseMirror schedules selection reconciliation 20 ms after focus.
    // This bubbling listener runs after its focus handler has scheduled that work.
    pendingEditorFocus = new Promise((resolve) => setTimeout(resolve, 20));
  }
}

beforeEach(() => {
  document.addEventListener("focusin", onEditorFocus);
});

afterEach(async () => {
  document.removeEventListener("focusin", onEditorFocus);
  await waitForEditorFocus();
  pendingEditorFocus = Promise.resolve();
});
