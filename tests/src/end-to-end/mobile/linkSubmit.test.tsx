import App from "@examples/03-ui-components/14-mobile-formatting-toolbar/src/App";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vite-plus/test";
import { render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { waitForSelector } from "../../utils/editor.js";

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";

// Submitting the link popover from an editor that is *not* the last on the
// page. Reported from a device: the link was never created and focus jumped
// to the second editor instead.
//
// Coverage limit worth knowing: the device-only half of that bug is which
// action Android's IME assigns to the Enter key. Being inside a real <form>
// is what makes it offer a submitting action instead of "Next" (advance
// focus, no key event at all) — confirmed on a device, where the popover
// commits from the first editor with no `enterkeyhint` hinting involved.
//
// No automated environment we have can exercise that choice: emulation always
// dispatches a real Enter, and on BrowserStack no input channel reaches the
// on-screen keyboard (see tests/device/README.md). What a test *can* hold onto
// is that submission works without a key event at all, which is the second
// test below; the IME's choice itself stays a release-checklist item.

beforeEach(async () => {
  await page.viewport(393, 727);
});

afterEach(async () => {
  await page.viewport(393, 727);
});

describe("Submitting the link popover", () => {
  test("creates the link in its own editor and keeps focus there", async () => {
    await render(<App />);
    await vi.waitFor(() => {
      if (document.querySelectorAll(EDITOR_SELECTOR).length < 2) {
        throw new Error("expected the example's two editors");
      }
    });
    const [first, second] =
      document.querySelectorAll<HTMLElement>(EDITOR_SELECTOR);

    await userEvent.click(first.querySelector("p")!);
    await userEvent.keyboard(
      "{Home}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}",
    );
    await page.viewport(393, 427);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    await userEvent.click(
      await waitForSelector(
        `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
      ),
    );
    const input = (await waitForSelector(
      'input[name="url"]',
    )) as HTMLInputElement;

    await userEvent.click(input);
    await userEvent.keyboard("example.com{Enter}");

    await vi.waitFor(() => {
      if (!first.querySelector('a[href="https://example.com"]')) {
        throw new Error(
          "link was not created in the editor it was opened from",
        );
      }
    });
    expect(second.querySelector('a[href="https://example.com"]')).toBeNull();

    // Focus must not have escaped into the other editor.
    expect(document.activeElement?.closest(EDITOR_SELECTOR)).not.toBe(second);
  });

  // The path a mobile IME actually takes. When its action key means "submit",
  // the browser submits the form — it does not necessarily deliver an Enter
  // keydown, so a popover that only listens for that key has no way to
  // commit. Driving the form's own submit is how that arrives, and it is the
  // part of the device-only bug a test can reproduce: without a real <form>
  // wired to a submit handler, nothing happens at all.
  test("submitting the form creates the link, without any key event", async () => {
    await render(<App />);
    await waitForSelector(EDITOR_SELECTOR);
    const [first] = document.querySelectorAll<HTMLElement>(EDITOR_SELECTOR);

    await userEvent.click(first.querySelector("p")!);
    await userEvent.keyboard(
      "{Home}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}",
    );
    await page.viewport(393, 427);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    await userEvent.click(
      await waitForSelector(
        `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
      ),
    );
    const input = (await waitForSelector(
      'input[name="url"]',
    )) as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.keyboard("example.com");

    const form = input.closest("form");
    expect(
      form,
      "the popover must be a real <form>, or the browser has no way to " +
        "submit it when a mobile IME's action key asks it to",
    ).not.toBeNull();

    // No Enter anywhere: this is the browser submitting the form itself.
    form!.requestSubmit();

    await vi.waitFor(() => {
      if (!first.querySelector('a[href="https://example.com"]')) {
        throw new Error("submitting the form did not create the link");
      }
    });
  });
});
