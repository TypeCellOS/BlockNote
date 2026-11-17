import { test as base } from "vite-plus/test";
import { commands, type CommandContext } from "../commands/index.js";

export const test = base.extend<CommandContext>(commands);

// The browser setup installs this extended API; imported Vitest APIs are not
// extended. tests/tsconfig.browser.json includes the setup for colocated tests.
declare global {
  var it: typeof test;
}
