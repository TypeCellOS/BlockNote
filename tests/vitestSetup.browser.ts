import type {} from "./src/commands/transport/keyboard.js";
import { aroundAll, aroundEach, beforeEach } from "vite-plus/test";
import { installBrowserTestStyles } from "./src/commands/browser/installBrowserTestStyles.js";
import { commands, page } from "./src/commands/transport.js";
import {
  installBrowserTestViewport,
  withBrowserTestGlobals,
} from "./src/fixtures/browserTestGlobals.js";

import {
  ensureTouchEmulation,
  hasTouchEmulation,
} from "./src/utils/ensureTouchEmulation.js";

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

  const restoreViewport = installBrowserTestViewport(document);
  try {
    const removeStyles = installBrowserTestStyles();
    try {
      await runSuite();
    } finally {
      removeStyles();
    }
  } finally {
    restoreViewport?.();
  }
});

// Drain focus and release the globals after per-test teardown.
aroundEach(withBrowserTestGlobals);

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
});
