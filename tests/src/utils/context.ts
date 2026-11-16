import {
  commands as vitestCommands,
  page,
  server,
  userEvent,
} from "vite-plus/test/browser";
import * as browserCommands from "./commands.browser.js";

// `vite-plus/test/browser` re-exports `vitest/browser`, which Vitest replaces
// with a generated virtual module while running in Browser Mode. Import it from
// this single place so the e2e utils + tests share one `userEvent` instance
// (it preserves keyboard/pointer state across calls) and one command surface.
export { page, server, userEvent };

type BrowserCommands<Implementations> = {
  [Name in keyof Implementations]: Implementations[Name] extends (
    ...args: infer Args
  ) => infer Result
    ? Args extends [unknown, ...infer BrowserArgs]
      ? (...args: BrowserArgs) => Promise<Awaited<Result>>
      : never
    : never;
};

// Vite+ does not expose the augmentable BrowserCommands interface. Derive the
// browser signatures from the implementations, omitting their Node context.
// Reader commands are available only in the native screen-reader configuration.
export const commands = {
  ...(vitestCommands as typeof vitestCommands &
    BrowserCommands<typeof import("../screen-reader/commands.js")>),
  ...browserCommands,
};

/** The browser instance the current test is running in. */
export const browserName = server.browser as "chromium" | "firefox" | "webkit";

/**
 * Platform modifier for `userEvent.keyboard` (Cmd on macOS, Ctrl elsewhere) —
 * the equivalent of Playwright's `ControlOrMeta`.
 */
export const MOD: "Meta" | "Control" =
  server.platform === "darwin" ? "Meta" : "Control";

export const selectToLineEndKey =
  server.platform === "darwin" ? "Meta+Shift+ArrowRight" : "Shift+End";
