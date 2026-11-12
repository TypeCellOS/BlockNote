import type { ImeCompositionCommand } from "./imeComposition.js";
import type { PositionalMouseCommand } from "./positionalMouse.js";
import type { Outline, EditorSelection } from "./accessibility.js";
import {
  commands as vitestCommands,
  page,
  server,
  userEvent,
} from "vite-plus/test/browser";

// `vite-plus/test/browser` re-exports `vitest/browser`, which Vitest replaces
// with a generated virtual module while running in Browser Mode. Import it from
// this single place so the e2e utils + tests share one `userEvent` instance
// (it preserves keyboard/pointer state across calls) and one command surface.
export { page, server, userEvent };

// Vite+ does not expose the augmentable BrowserCommands interface.
export const commands = vitestCommands as typeof vitestCommands & {
  positionalMouse: PositionalMouseCommand;
  imeComposition: ImeCompositionCommand;
  restoreTouchEmulation(): Promise<void>;
  // Registered only by the native screen-reader configuration.
  startReader(selector: string): Promise<void>;
  readTranscript(): Promise<string[]>;
  stopReader(): Promise<void>;
  pressKey(key: string): Promise<void>;
  readAriaSnapshot(selector: string): Promise<string>;
  readOutline(selector: string): Promise<Outline>;
  checkFocusOutline(
    selector: string,
    unfocusedOutline?: Outline,
  ): Promise<void>;
  readSelection(): Promise<EditorSelection>;
  checkAxe(scope?: string): Promise<string[]>;
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
