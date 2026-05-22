import type { ReactElement } from "react";
import { render } from "vitest-browser-react";
import { EDITOR_SELECTOR } from "./const.js";
import { waitForSelector } from "./editor.js";

/**
 * Mounts an example `App` and waits for its editor to appear. Replaces the old
 * `page.goto(<example URL>)` flow — in Vitest Browser Mode the example component
 * is rendered directly, no preview server needed.
 *
 * Usage:
 *   import App from "@examples/01-basic/testing/src/App";
 *   beforeEach(() => renderEditor(<App />));
 */
export async function renderEditor(ui: ReactElement) {
  const result = render(ui);
  await waitForSelector(EDITOR_SELECTOR);
  return result;
}
