import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, sleep, waitForSelector } from "../../utils/editor.js";
import { moveMouseOverElement } from "../../utils/mouse.js";

// The link forms open from toolbars whose menus and popovers portal next to
// the toolbar rather than inside it. These tests click with `userEvent.click`
// on purpose: it presses and releases within the same tick, which is how the
// mantine toolbar's former focus trap used to steal the form's autofocus back
// into the toolbar before a human could type.

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

const LINK_SELECTOR = 'a[data-inline-content-type="link"]';

async function createLink(url: string) {
  await focusOnEditor();
  await userEvent.keyboard("Paragraph");
  await userEvent.keyboard("{Shift>}{Home}{/Shift}");
  await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));
  await userEvent.keyboard(url);
  await userEvent.keyboard("{Enter}");
  await waitForSelector(LINK_SELECTOR);
}

describe("Link forms keep focus after an instantaneous click", () => {
  test("Create link: typing right after the click fills the URL field", async () => {
    await createLink("https://example.com");

    expect(document.querySelector<HTMLAnchorElement>(LINK_SELECTOR)?.href).toBe(
      "https://example.com/",
    );
  });

  test("Link toolbar: Edit focuses the URL field and Enter applies the change", async () => {
    await createLink("https://example.com");

    await userEvent.keyboard("{End}");
    await userEvent.keyboard("{ArrowLeft}");
    await moveMouseOverElement(LINK_SELECTOR);
    const linkToolbar = await waitForSelector(".bn-link-toolbar");

    await userEvent.click(linkToolbar.querySelector("button")!);
    await sleep(300);

    const input = await waitForSelector(".bn-form-popover input");
    expect(document.activeElement).toBe(input);

    await userEvent.keyboard("{Control>}a{/Control}{Meta>}a{/Meta}");
    await userEvent.keyboard("https://changed.example");
    await userEvent.keyboard("{Enter}");
    await sleep(300);

    expect(document.querySelector<HTMLAnchorElement>(LINK_SELECTOR)?.href).toBe(
      "https://changed.example/",
    );
  });
});
