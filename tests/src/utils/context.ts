import { createUserEvent, page } from "vite-plus/test/browser/context";

// This vite-plus build's `@vitest/browser/context` runtime only exports
// `createUserEvent`, `page`, `cdp`, `locators`, `utils` — there is no default
// `userEvent`, `server`, or `commands` export (the published `.d.ts` lists them,
// but they aren't in the runtime bundle). So we adapt here and re-export a
// single shared API surface for the e2e utils + tests to consume.

/** Shared userEvent instance (preserves keyboard/pointer state across calls). */
export const userEvent = createUserEvent();

export { page };

/**
 * Triggers a custom browser command registered in `vite.config.browser.ts`
 * (e.g. `positionalMouse`). The public `server.commands` API isn't exported in
 * this build, so we go through the browser runner directly.
 */
export function triggerCommand<T = unknown>(
  name: string,
  args: unknown[] = [],
): Promise<T> {
  return (window as any).__vitest_browser_runner__.commands.triggerCommand(
    name,
    args,
  );
}

const ua = navigator.userAgent;

/** The browser instance the current test is running in. */
export const browserName: "chromium" | "firefox" | "webkit" = /Firefox/.test(ua)
  ? "firefox"
  : /Chrome|Chromium|HeadlessChrome/.test(ua)
    ? "chromium"
    : "webkit";

/**
 * Platform modifier for `userEvent.keyboard` (Cmd on macOS, Ctrl elsewhere) —
 * the equivalent of Playwright's `ControlOrMeta`. Derived from the browser the
 * test runs in, since `server.platform` isn't available.
 */
export const MOD: "Meta" | "Control" = /Mac|iPhone|iPad/i.test(
  navigator.platform || ua,
)
  ? "Meta"
  : "Control";
