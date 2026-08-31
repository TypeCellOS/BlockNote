import TestingApp from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

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

  test("the embed tab exposes exactly one submit control", async () => {
    // Its own Embed button is the form's submit control, so `Form.Root` must
    // not add a second hidden one — a screen reader would otherwise announce
    // two separate actions for the one thing this panel does.
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

  test("the embed tab commits exactly once", async () => {
    // The embed button sits outside the form on purpose: the skins disagree on
    // whether their panel button defaults to `type="submit"`, so inside one it
    // would fire `onClick` *and* submit, applying the same edit twice.
    await focusOnEditor();
    await executeSlashCommand("image");

    await userEvent.click(await waitForSelector(`[data-test="embed-tab"]`));
    const input = (await waitForSelector(
      `[data-test="embed-input"]`,
    )) as HTMLInputElement;
    await userEvent.click(input);

    const url = "https://placehold.co/400x300.png";
    await userEvent.keyboard(url);
    await userEvent.click(
      await waitForSelector(`[data-test="embed-input-button"]`),
    );

    await waitForSelector(`img[src="${url}"]`);
    expect(document.querySelectorAll(`img[src="${url}"]`).length).toBe(1);
  });
});
