import { sharedTest as base, type SharedContext } from "./editor.shared.js";
import { commands, type CommandContext } from "../commands/index.js";

export type BrowserContext = Omit<SharedContext, "setupEditor"> &
  CommandContext;

export const test = base.extend<CommandContext>(commands);
