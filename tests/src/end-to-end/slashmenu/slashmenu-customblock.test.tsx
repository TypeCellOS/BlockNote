import App from "@examples/06-custom-schema/01-alert-block/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, SLASH_MENU_SELECTOR } from "../../utils/const.js";
import { waitForSelector } from "../../utils/editor.js";

// `expect.element` is augmented against the bare `vitest` module, but vite-plus
// types `expect` from an internal module, so the augmentation doesn't attach.
// Type the accessor locally.
type ElementMatchers = {
  toBeVisible(): Promise<void>;
  not: { toBeVisible(): Promise<void> };
};
type ElementExpect = (element: Element | null) => ElementMatchers;
const expectElement = (expect as unknown as { element: ElementExpect }).element;

// Regression test for https://github.com/TypeCellOS/BlockNote/issues/2531
// The slash menu should open when "/" is typed after a space inside a custom
// block (isolating: true, separate contentDOM). Previously the menu failed to
// open in this scenario.
describe("Slash menu in custom (alert) block – issue #2531", () => {
  beforeEach(async () => {
    await render(<App />);
    await waitForSelector(EDITOR_SELECTOR);
  });

  test("opens slash menu when / is typed at end of alert block content (no preceding space)", async () => {
    // Click into the editable content area of the alert block
    const alertContent = document.querySelector(
      '[data-content-type="alert"] .bn-inline-content',
    ) as HTMLElement;
    await userEvent.click(alertContent);
    await userEvent.keyboard("{End}");

    await userEvent.keyboard("/");
    await expectElement(
      await waitForSelector(SLASH_MENU_SELECTOR),
    ).toBeVisible();
  });

  test("opens slash menu when / is typed after a space inside alert block (the regression)", async () => {
    // Click into the editable content area of the alert block
    const alertContent = document.querySelector(
      '[data-content-type="alert"] .bn-inline-content',
    ) as HTMLElement;
    await userEvent.click(alertContent);
    await userEvent.keyboard("{End}");

    // Type a space first — this is the scenario that broke the menu
    await userEvent.keyboard(" ");
    await userEvent.keyboard("/");
    await expectElement(
      await waitForSelector(SLASH_MENU_SELECTOR),
    ).toBeVisible();
  });
});
