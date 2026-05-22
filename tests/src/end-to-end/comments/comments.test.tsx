import App from "@examples/07-collaboration/09-comments-testing/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { browserName, page, userEvent } from "../../utils/context.js";
import { LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, sleep, waitForSelector } from "../../utils/editor.js";
import { clickAt, getRect } from "../../utils/mouse.js";
import { renderEditor } from "../../utils/render.js";

// `expect.element` is augmented against the bare `vitest` module, but vite-plus
// types `expect` from an internal module, so the augmentation doesn't attach.
// Type the accessor locally.
type ElementMatchers = {
  toBeVisible(): Promise<void>;
  not: { toBeVisible(): Promise<void> };
};
type ElementExpect = (element: Element | null) => ElementMatchers;
const expectElement = (expect as unknown as { element: ElementExpect }).element;

/** Double-clicks the centre of an element via the real Playwright mouse. */
async function doubleClickElement(element: Element) {
  const { x, y, width, height } = getRect(element);
  await clickAt(x + width / 2, y + height / 2, 2);
}

beforeEach(async () => {
  await renderEditor(<App />);
});

describe("Check Comments functionality", () => {
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
