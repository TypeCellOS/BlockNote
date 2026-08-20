import { onYSyncInternalError } from "@blocknote/core/y";
import { afterEach, beforeAll, beforeEach } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

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
beforeAll(async () => {
  await page.viewport(1280, 720);

  // Match the playground's editor framing so screenshots line up with what
  // users see at https://www.blocknotejs.org/examples (max-width 731px,
  // horizontally centred, slight top padding). Without this the editor
  // stretches the full 1280px and snapshot baselines drift from production.
  const style = document.createElement("style");
  style.textContent = `.bn-container { max-width: 731px; margin: 0 auto; padding-top: 8px; }`;
  document.head.appendChild(style);
});

beforeEach(() => {
  (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS = {};
});

afterEach(() => {
  delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
});

// --- Console failure guard --------------------------------------------------
// Some dependencies deliberately swallow hard failures into console output.
// The important case is @y/prosemirror's y-sync "last-resort safety" catch,
// which downgrades an Error thrown mid-sync into
//   console.warn('[y/prosemirror] ytype.applyDelta failed - reverting …', err)
// and leaves the UI silently stale — the suggestion-gallery move-diff bug
// stayed invisible for two months exactly this way. To keep that class of bug
// loud in CI, a test fails when it produces:
//   - any `console.error` call (minus CONSOLE_ERROR_ALLOWLIST), or
//   - a `console.warn` matching CONSOLE_WARN_DENYLIST (known swallowed-error
//     sources), or
//   - an internal error y-prosemirror recovered from, observed via
//     `onYSyncInternalError` (fed by `YSyncRdt`'s `onInternalError` debugging
//     option, shipped in @y/prosemirror 2.0.0-7 after yjs/y-prosemirror#273;
//     our pnpm patch threads it through syncPlugin). The observer receives
//     the original Error with its stack; y-prosemirror's own warning still
//     fires too, so a swallowed sync error shows up as both entries.
// Uncaught exceptions (window "error" events) are already failed by vitest
// itself; this guard only covers failures something caught and logged.
//
// Allowlist deliberate console output per-pattern below, with a comment
// saying which test produces it and why it is expected.

const CONSOLE_ERROR_ALLOWLIST: RegExp[] = [
  // React's structural dev warning for rich-text editors: React-rendered
  // custom-block content lives inside the ProseMirror-managed contentEditable,
  // so React cannot guarantee those children stay untouched. Inherent to the
  // integration (fires in the custom-blocks e2e), not a swallowed failure.
  /A component is `contentEditable` and contains `children` managed by React/,
];
const CONSOLE_WARN_DENYLIST: RegExp[] = [/\[y\/prosemirror\]/];

function formatConsoleArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack ?? String(arg);
  }
  if (typeof arg === "string") {
    return arg;
  }
  try {
    return JSON.stringify(arg) ?? String(arg);
  } catch {
    return String(arg);
  }
}

const consoleViolations: string[] = [];
let unsubscribeInternalErrors: (() => void) | undefined;
/* eslint-disable no-console -- the guard intercepts the console by design */
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  consoleViolations.length = 0;
  console.error = (...args: unknown[]) => {
    originalConsoleError.apply(console, args);
    const text = args.map(formatConsoleArg).join(" ");
    if (!CONSOLE_ERROR_ALLOWLIST.some((pattern) => pattern.test(text))) {
      consoleViolations.push(`console.error: ${text}`);
    }
  };
  console.warn = (...args: unknown[]) => {
    originalConsoleWarn.apply(console, args);
    const text = args.map(formatConsoleArg).join(" ");
    if (CONSOLE_WARN_DENYLIST.some((pattern) => pattern.test(text))) {
      consoleViolations.push(`console.warn: ${text}`);
    }
  };
  // The observer entry is the one carrying the original stack (the package's
  // own warning, caught by the denylist above, flattens the error).
  unsubscribeInternalErrors = onYSyncInternalError((error, errCode) => {
    consoleViolations.push(
      `[y/prosemirror internal error] (code ${errCode}) ${formatConsoleArg(error)}`,
    );
  });
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  unsubscribeInternalErrors?.();
  unsubscribeInternalErrors = undefined;
  if (consoleViolations.length > 0) {
    const report = consoleViolations.splice(0).join("\n\n");
    throw new Error(
      "Test produced console output that indicates a swallowed failure " +
        "(see the console guard in vitestSetup.browser.ts — allowlist " +
        `deliberate output there):\n\n${report}`,
    );
  }
});
/* eslint-enable no-console */
