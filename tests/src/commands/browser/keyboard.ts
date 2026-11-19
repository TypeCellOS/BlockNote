import { server } from "../transport.js";

/** Platform modifier for `userEvent.keyboard`: Cmd on macOS, Ctrl elsewhere. */
export const MOD: "Meta" | "Control" =
  server.platform === "darwin" ? "Meta" : "Control";

/** Platform shortcut for extending the text selection to the end of its line. */
export const selectToLineEndKey =
  server.platform === "darwin" ? "Meta+Shift+ArrowRight" : "Shift+End";
