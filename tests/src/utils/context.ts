import { server } from "../commands/transport.js";

export { page, server, userEvent } from "../commands/transport.js";
import * as browserCommands from "../commands/browser/index.js";
import * as baselineCommands from "../commands/node/index.js";
import { commands as nodeCommands } from "../commands/transport.js";

// Compatibility for existing suites; extended tests use top-level fixtures.
export const commands = {
  ...baselineCommands,
  ...nodeCommands,
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
