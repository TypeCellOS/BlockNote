import type {} from "./src/commands/transport/keyboard.js";
import { aroundAll, aroundEach, beforeEach } from "vite-plus/test";
import { cleanup } from "vitest-browser-react/pure";
import { installBrowserTestStyles } from "./src/commands/browser/installBrowserTestStyles.js";
import { commands } from "./src/commands/transport.js";
import {
  installBrowserTestViewport,
  withBrowserTestGlobals,
} from "./src/fixtures/browserTestGlobals.js";

import {
  ensureTouchEmulation,
  hasTouchEmulation,
} from "./src/utils/ensureTouchEmulation.js";

aroundAll(async (runSuite) => {
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

// Drain focus and release the globals after inner hooks, including React cleanup.
aroundEach(withBrowserTestGlobals);

// The upstream renderer registers its own beforeEach when first imported,
// which is not repeated when a later file reuses this iframe. Dispose its
// test-owned roots here; setupEditor and manually mounted roots own themselves.
aroundEach(async (runTest) => {
  try {
    await runTest();
  } finally {
    await cleanup();
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
});
