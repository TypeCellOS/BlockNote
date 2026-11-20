import type { TestAPI } from "vite-plus/test";
import { test as base, type NodeContext } from "./editor.node.js";
import { commands, type CommandContext } from "../commands/index.js";

export type BrowserContext = Omit<NodeContext, "setupEditor"> & CommandContext;

export const test: TestAPI<BrowserContext> =
  base.extend<CommandContext>(commands);
