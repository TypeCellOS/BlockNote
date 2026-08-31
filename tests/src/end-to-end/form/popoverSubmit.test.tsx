import TestingApp from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { browserName, commands, userEvent } from "../../utils/context.js";
import type { ImeCompositionCommand } from "../../utils/imeComposition.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

const browserCommands = commands as typeof commands & {
  imeComposition: ImeCompositionCommand;
};

/**
 * The toolbar popovers commit through their form's `submit` event, because a
 * mobile IME's action key fires that and no key event at all.
 *
 * These drive Enter rather than calling the handlers, so they cover the whole
 * path a browser takes to reach `onSubmit` — including whether the form is
 * eligible for implicit submission at all, which depends on how many fields
 * the popover happens to render (see ./implicitSubmit.test.tsx).
 */

beforeEach(async () => {
  await render(<TestingApp />);
  await waitForSelector(EDITOR_SELECTOR);
});

async function createLink(url: string) {
  await focusOnEditor();
  await userEvent.keyboard("link me");
  await userEvent.keyboard("{Home}{Shift>}{End}{/Shift}");
  await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));
  const input = (await waitForSelector(
    'input[name="url"]',
  )) as HTMLInputElement;
  await userEvent.click(input);
  await userEvent.keyboard(`${url}{Enter}`);
  return waitForSelector(`a[href="https://${url}"]`);
}

describe("Submitting a toolbar popover with Enter", () => {
  test("the link edit form commits, though it has two fields", async () => {
    // The regression this guards: HTML only submits a form implicitly when it
    // has a submit button *or* exactly one field. The create form has one
    // field (url) and submits on its own; this edit form adds the title
    // field, so without the submit button `Form.Root` renders, Enter reaches
    // nothing and the edit is silently dropped.
    const link = await createLink("example.com");

    await userEvent.hover(link);
    await vi.waitFor(() => {
      const editButton = [
        ...document.querySelectorAll<HTMLElement>(".bn-toolbar button"),
      ].find((button) => button.textContent?.trim() === "Edit link");
      if (!editButton) {
        throw new Error("the link toolbar's edit button never appeared");
      }
      editButton.click();
    });

    const urlInput = (await waitForSelector(
      'input[name="url"]',
    )) as HTMLInputElement;
    // Both fields are present — that is what makes this case different.
    expect(document.querySelector('input[name="title"]')).not.toBeNull();

    await userEvent.tripleClick(urlInput);
    await userEvent.keyboard("edited.com{Enter}");

    await vi.waitFor(() => {
      if (!document.querySelector('a[href="https://edited.com"]')) {
        throw new Error("Enter did not commit the two-field edit form");
      }
    });
  });

  test("the submit control stays available to assistive technology", async () => {
    // `display: none` would take the button out of the accessibility tree
    // entirely, leaving Enter as the only way to commit — nothing for a
    // screen reader or voice control to target. It has to be clipped instead,
    // and carry a real accessible name.
    await createLink("example.com");

    await userEvent.hover(
      await waitForSelector('a[href="https://example.com"]'),
    );
    await vi.waitFor(() => {
      const editButton = [
        ...document.querySelectorAll<HTMLElement>(".bn-toolbar button"),
      ].find((button) => button.textContent?.trim() === "Edit link");
      if (!editButton) {
        throw new Error("the link toolbar's edit button never appeared");
      }
      editButton.click();
    });
    const input = await waitForSelector('input[name="url"]');

    const submit = input.closest("form")!.querySelector("button[type=submit]");
    expect(submit, "the form must expose a submit control").not.toBeNull();

    const styles = getComputedStyle(submit!);
    expect(styles.display).not.toBe("none");
    expect(styles.visibility).not.toBe("hidden");
    expect(submit!.textContent?.trim(), "it needs an accessible name").toBe(
      "OK",
    );
    // Out of the tab order, so sighted keyboard users never land on a control
    // they can't see.
    expect((submit as HTMLButtonElement).tabIndex).toBe(-1);
  });

  test("the embed tab keeps its button out of the form", async () => {
    // Two things ride on the button staying outside the `<form>`, which is why
    // this asserts the structure rather than an outcome:
    //
    // - `Form.Root` must not also add its hidden submit button, or a screen
    //   reader announces two separate actions for the one thing this panel
    //   does.
    // - Inside the form the button would fire `onClick` *and* submit on the
    //   skins whose panel button defaults to `type="submit"` (ariakit and
    //   shadcn; mantine's defaults to `type="button"`), embedding twice.
    //   Only mantine runs in this suite, so a double-commit assertion here
    //   could never fail — the structural check is what actually guards it.
    await focusOnEditor();
    await executeSlashCommand("image");
    await userEvent.click(await waitForSelector(`[data-test="embed-tab"]`));
    const input = await waitForSelector(`[data-test="embed-input"]`);

    const form = input.closest("form");
    expect(form, "the embed field must still be in a form").not.toBeNull();
    expect(form!.querySelectorAll("button").length).toBe(0);
  });

  test("the embed tab's URL field commits", async () => {
    // The embed tab used to be the one input with an Enter handler and no
    // form at all, so its action key did nothing on mobile.
    await focusOnEditor();
    await executeSlashCommand("image");

    await userEvent.click(await waitForSelector(`[data-test="embed-tab"]`));
    const input = (await waitForSelector(
      `[data-test="embed-input"]`,
    )) as HTMLInputElement;
    await userEvent.click(input);

    const url = "https://placehold.co/800x540.png";
    await userEvent.keyboard(`${url}{Enter}`);

    await waitForSelector(`img[src="${url}"]`);
  });

  // `Input.imeSetComposition` is CDP-only, so the real composition state can
  // only be entered in chromium.
  test.skipIf(browserName !== "chromium")(
    "accepting an IME candidate does not commit the popover",
    async () => {
      // The real accept path: the IME consumes the confirming key and
      // replaces the composition with the final text, so no actionable Enter
      // reaches the page and nothing submits — natively, with no composition
      // guard in `Form.Root` (see ./compositionSubmit.test.tsx for why none
      // is needed).
      await focusOnEditor();
      await userEvent.keyboard("link me");
      await userEvent.keyboard("{Home}{Shift>}{End}{/Shift}");
      await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));
      const input = (await waitForSelector(
        'input[name="url"]',
      )) as HTMLInputElement;
      await userEvent.click(input);

      await browserCommands.imeComposition([
        { type: "setComposition", text: "example.co" },
        { type: "commit", text: "example.com" },
      ]);

      expect(input.value).toBe("example.com");
      expect(
        document.querySelector(`${EDITOR_SELECTOR} a`),
        "accepting a candidate must not commit the link",
      ).toBeNull();

      // Enter after the composition commits it as usual.
      await userEvent.keyboard("{Enter}");
      await waitForSelector(`${EDITOR_SELECTOR} a`);
    },
  );
});
