import axe from "axe-core";
import App from "@examples/01-basic/testing/src/App";
import { afterEach, beforeEach, describe, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { ensureTouchEmulation } from "../../utils/ensureTouchEmulation.js";

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";

/**
 * Pre-existing violations, tracked rather than asserted away. Matched by
 * rule AND target selector so a *new* instance of the same rule (say, a
 * toolbar button losing its label) still fails:
 *
 * - `aria-input-field-name` on the contenteditable: the editor's textbox
 *   role has no accessible name. Real fix: an aria-label (localized) on the
 *   editor element via `editorProps.attributes` — product follow-up.
 * - `color-contrast` on the `data-show-selection` decoration: the fake
 *   selection highlight (shown while a popover holds focus) fails contrast
 *   with the text over it — design follow-up.
 */
const KNOWN_VIOLATIONS: { id: string; targetPattern: RegExp }[] = [
  { id: "aria-input-field-name", targetPattern: /tiptap|bn-editor/ },
  { id: "color-contrast", targetPattern: /data-show-selection/ },
];

/**
 * Runs axe over the page and fails on any serious/critical violation that
 * isn't in {@link KNOWN_VIOLATIONS}. The `region` rule is disabled: it
 * demands app-shell landmarks, which belong to the host app, not the
 * embedded editor.
 */
async function expectNoNewViolations(state: string) {
  const results = await axe.run(document.body, {
    resultTypes: ["violations"],
    rules: { region: { enabled: false } },
  });
  const unexpected = results.violations
    .filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    )
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.filter(
        (node) =>
          !KNOWN_VIOLATIONS.some(
            (known) =>
              known.id === violation.id &&
              node.target.some((target) =>
                known.targetPattern.test(String(target)),
              ),
          ),
      ),
    }))
    .filter((violation) => violation.nodes.length > 0);
  if (unexpected.length > 0) {
    throw new Error(
      `New accessibility violations in state "${state}": ${JSON.stringify(
        unexpected.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          targets: violation.nodes.map((node) => node.target),
        })),
        null,
        2,
      )}`,
    );
  }
}

beforeEach(async () => {
  ensureTouchEmulation();
  await page.viewport(393, 727);
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

afterEach(async () => {
  await page.viewport(393, 727);
});

describe("Mobile accessibility (axe)", () => {
  test("editor with the mobile toolbar open", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Accessibility target");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await page.viewport(393, 427);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    await expectNoNewViolations("mobile toolbar open");
  });

  test("link popover open", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Link target");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await page.viewport(393, 427);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    await userEvent.click(
      await waitForSelector(
        `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
      ),
    );
    await vi.waitFor(() => {
      if (!(document.activeElement instanceof HTMLInputElement)) {
        throw new Error("URL input did not receive focus");
      }
    });

    await expectNoNewViolations("link popover open");
  });
});
