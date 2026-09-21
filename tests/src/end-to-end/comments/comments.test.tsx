import App from "@examples/07-collaboration/09-comments-testing/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { browserName, page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import {
  expectElement,
  focusOnEditor,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import { clickAt, getRect, moveMouseOverElement } from "../../utils/mouse.js";

/** Double-clicks the centre of an element via the real Playwright mouse. */
async function doubleClickElement(element: Element) {
  const { x, y, width, height } = getRect(element);
  await clickAt(x + width / 2, y + height / 2, 2);
}

/** Resolves once exactly `count` elements match `selector`. */
function expectSelectorCount(selector: string, count: number) {
  return vi.waitFor(() => {
    const actual = document.querySelectorAll(selector).length;
    if (actual !== count) {
      throw new Error(`Expected ${count} of "${selector}", found ${actual}`);
    }
  });
}

// emoji-mart renders `<em-emoji-picker>` as a custom element whose emoji
// buttons live inside its shadow root, so a plain `document.querySelector`
// can't reach them. These helpers pierce the shadow root.
function emojiButtons(): HTMLButtonElement[] {
  const picker = document.querySelector("em-emoji-picker");
  if (!picker?.shadowRoot) {
    return [];
  }
  return Array.from(
    picker.shadowRoot.querySelectorAll<HTMLButtonElement>(
      "button[aria-posinset]",
    ),
  );
}

/** Resolves once the emoji picker has rendered at least `min` emoji buttons. */
function waitForEmojiButtons(min = 1): Promise<HTMLButtonElement[]> {
  return vi.waitFor(() => {
    const buttons = emojiButtons();
    if (buttons.length < min) {
      throw new Error(`Emoji picker not ready (found ${buttons.length})`);
    }
    return buttons;
  });
}

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Check Comments functionality", () => {
  test("Enter submits comments, replies and edits; Shift+Enter inserts a line break", async () => {
    await focusOnEditor();
    await userEvent.keyboard("hello");
    await doubleClickElement(page.getByText("hello").element());
    await userEvent.click(await waitForSelector('[data-test="addcomment"]'));
    const composer = await waitForSelector(
      '.bn-comment-editor [contenteditable="true"]',
    );

    // Empty comments cannot be submitted, and Enter must not add a block.
    await userEvent.keyboard("{Enter}");
    expect(composer.querySelectorAll(".bn-block-content")).toHaveLength(1);
    await expectSelectorCount(".bn-thread", 1);

    await userEvent.keyboard("first line{Shift>}{Enter}{/Shift}second line");
    expect(composer.querySelectorAll(".bn-block-content")).toHaveLength(1);
    expect(composer.querySelector("br")).not.toBeNull();

    // Enter used to confirm IME composition must not submit the comment.
    composer.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await expectSelectorCount(".bn-thread", 1);

    await userEvent.keyboard("{Enter}");
    await expectSelectorCount(".bn-thread", 0);
    await userEvent.click(await waitForSelector("span.bn-thread-mark"));
    await expectSelectorCount(".bn-thread-comment", 1);
    expect(document.querySelector(".bn-thread-comment")?.textContent).toContain(
      "second line",
    );

    await userEvent.click(
      await waitForSelector('.bn-thread-composer [contenteditable="true"]'),
    );
    await userEvent.keyboard("reply{Enter}");
    await expectSelectorCount(".bn-thread-comment", 2);
    await moveMouseOverElement(await waitForSelector(".bn-thread-comment"));
    await userEvent.click(await waitForSelector('[data-test="moreActions"]'));
    await userEvent.click(page.getByRole("menuitem", { name: "Edit comment" }));
    await userEvent.keyboard("{End} edited{Enter}");
    await expectSelectorCount('.bn-thread-comment [contenteditable="true"]', 0);
    expect(document.querySelector(".bn-thread-comment")?.textContent).toContain(
      "edited",
    );
  });

  test("Should be able to add reactions", async () => {
    await focusOnEditor();

    await userEvent.keyboard("hello");
    await doubleClickElement(page.getByText("hello").element());

    await userEvent.click(await waitForSelector('[data-test="addcomment"]'));
    await waitForSelector(".bn-thread");

    await userEvent.keyboard("test comment");
    await userEvent.click(await waitForSelector('button[data-test="save"]'));

    // Wait for comment composer to close.
    await expectSelectorCount(".bn-thread", 0);

    await userEvent.click(await waitForSelector("span.bn-thread-mark"));
    await expectElement(
      await waitForSelector(".bn-thread-comment"),
    ).toBeVisible();

    // Hover comment to reveal action toolbar.
    await moveMouseOverElement(await waitForSelector(".bn-thread-comment"));
    await expectElement(
      await waitForSelector('[data-test="addreaction"]'),
    ).toBeVisible();

    // Add a reaction via the action toolbar's add-reaction button.
    await userEvent.click(await waitForSelector('[data-test="addreaction"]'));
    const firstPickerButtons = await waitForEmojiButtons();
    await userEvent.click(firstPickerButtons[0]);
    await expectSelectorCount("em-emoji-picker", 0);
    await expectSelectorCount(".bn-comment-reaction", 1);

    // Add a second reaction via the add-reaction badge.
    await moveMouseOverElement(await waitForSelector(".bn-thread-comment"));
    await userEvent.click(await waitForSelector(".bn-comment-add-reaction"));

    // Pick a different emoji so it's added as a new reaction rather than
    // toggling the first one off.
    const secondPickerButtons = await waitForEmojiButtons(6);
    await userEvent.click(secondPickerButtons[5]);
    await expectSelectorCount("em-emoji-picker", 0);
    await expectSelectorCount(".bn-comment-reaction", 2);
  });

  test("Should preserve existing comments when adding a link", async () => {
    await focusOnEditor();

    await userEvent.keyboard("hello");
    await doubleClickElement(page.getByText("hello").element());

    await userEvent.click(await waitForSelector('[data-test="addcomment"]'));
    await waitForSelector(".bn-thread");

    await userEvent.keyboard("test comment");
    await userEvent.click(await waitForSelector('button[data-test="save"]'));

    await doubleClickElement(
      document.querySelectorAll("span.bn-thread-mark")[0] as HTMLElement,
    );

    await expectElement(
      await waitForSelector(LINK_BUTTON_SELECTOR),
    ).toBeVisible();
    await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));

    await userEvent.keyboard("https://example.com");
    await userEvent.keyboard("{Enter}");

    await expectElement(
      await waitForSelector("span.bn-thread-mark"),
    ).toBeVisible();
  });

  test.skipIf(browserName === "webkit")(
    "Should select thread on first click and open link on second click",
    async () => {
      await focusOnEditor();

      await userEvent.keyboard("hello");
      await doubleClickElement(page.getByText("hello").element());

      await userEvent.click(await waitForSelector('[data-test="addcomment"]'));
      await waitForSelector(".bn-thread");

      await userEvent.keyboard("test comment");
      await userEvent.click(await waitForSelector('button[data-test="save"]'));

      await doubleClickElement(
        document.querySelectorAll("span.bn-thread-mark")[0] as HTMLElement,
      );

      await expectElement(
        await waitForSelector(LINK_BUTTON_SELECTOR),
      ).toBeVisible();
      await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));

      await userEvent.keyboard("https://example.com");
      await userEvent.keyboard("{Enter}");

      await userEvent.keyboard("{ArrowDown}");
      await sleep(500);
      expect(document.querySelectorAll(".bn-thread-mark-selected").length).toBe(
        0,
      );

      const link = document.querySelectorAll(
        'a[data-inline-content-type="link"]',
      )[0] as HTMLElement;

      // First click selects the thread without navigating.
      await userEvent.click(link);
      await sleep(500);
      await expectElement(
        await waitForSelector(".bn-thread-mark-selected"),
      ).toBeVisible();

      // Second click on the now-selected thread navigates to the link target.
      const windowOpen = vi
        .spyOn(window, "open")
        .mockImplementation(() => null);
      await userEvent.click(link);
      await vi.waitFor(() => {
        if (!windowOpen.mock.calls.length) {
          throw new Error("window.open was not called");
        }
      });
      windowOpen.mockRestore();
    },
  );
});
