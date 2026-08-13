import { commands, page, server, userEvent } from "vite-plus/test/browser";

// `vite-plus/test/browser` re-exports `vitest/browser`, which Vitest replaces
// with a generated virtual module while running in Browser Mode. Import it from
// this single place so the e2e utils + tests share one `userEvent` instance
// (it preserves keyboard/pointer state across calls) and one command surface.
export { commands, page, server, userEvent };

/** The browser instance the current test is running in. */
export const browserName = server.browser as "chromium" | "firefox" | "webkit";

/**
 * Platform modifier for `userEvent.keyboard` (Cmd on macOS, Ctrl elsewhere) —
 * the equivalent of Playwright's `ControlOrMeta`.
 */
export const MOD: "Meta" | "Control" =
  server.platform === "darwin" ? "Meta" : "Control";
