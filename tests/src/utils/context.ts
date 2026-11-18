export { page, server, userEvent } from "../commands/transport.js";
export {
  MOD,
  browserName,
  selectToLineEndKey,
} from "../commands/browser/index.js";
import * as browserCommands from "../commands/browser/index.js";
import * as baselineCommands from "../commands/node/index.js";
import { commands as nodeCommands } from "../commands/transport.js";

// Compatibility for existing suites; extended tests use top-level fixtures.
export const commands = {
  ...baselineCommands,
  ...nodeCommands,
  ...browserCommands,
};
