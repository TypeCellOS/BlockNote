import App from "@examples/01-basic/08-ariakit/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import {
  DRAG_HANDLE_SELECTOR,
  EDITOR_SELECTOR,
  LINK_BUTTON_SELECTOR,
  PARAGRAPH_SELECTOR,
} from "../../utils/const.js";
import {
  focusOnEditor,
  expectElement,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import { mouseSequence, moveMouseOverElement } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Check Ariakit UI", () => {
  test("Check formatting toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot(
      "ariakit-formatting-toolbar",
    );
  });
  test("Check link toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));

    await userEvent.keyboard("link");
    await userEvent.keyboard("{Enter}");
    await sleep(500);
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowRight}");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot(
      "ariakit-link-toolbar",
    );
  });
  test("Check slash menu", async () => {
    await focusOnEditor();
    await userEvent.keyboard("/");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("ariakit-slash-menu");
  });
  test("Check emoji picker", async () => {
    await focusOnEditor();
    await userEvent.keyboard(":");
    await userEvent.keyboard("sm");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot(
      "ariakit-emoji-picker",
    );
  });
  test("Check side menu", async () => {
    await focusOnEditor();
    await waitForSelector(PARAGRAPH_SELECTOR);
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("ariakit-side-menu");
  });
  test("Check drag handle menu", async () => {
    await focusOnEditor();
    await waitForSelector(PARAGRAPH_SELECTOR);
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    await sleep(500);
    await waitForSelector(DRAG_HANDLE_SELECTOR);
    await moveMouseOverElement(DRAG_HANDLE_SELECTOR);
    await mouseSequence([{ type: "down" }, { type: "up" }]);

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot(
      "ariakit-drag-handle-menu",
    );

    // The colors submenu opens over the side menu. Menus render inside the
    // side menu's wrapper, so they paint above its buttons; a menu portalled
    // elsewhere with Ariakit's own z-index would be covered by the drag handle.
    await moveMouseOverElement(
      Array.from(document.querySelectorAll("[role=menuitem]")).find((item) =>
        item.textContent?.includes("Colors"),
      )!,
    );
    const submenu = await waitForSelector(".bn-color-picker-dropdown");
    const handle = document
      .querySelector(DRAG_HANDLE_SELECTOR)!
      .getBoundingClientRect();
    const onTop = document.elementFromPoint(
      handle.x + handle.width / 2,
      handle.y + handle.height / 2,
    );
    const submenuRect = submenu.getBoundingClientRect();
    const overlaps =
      handle.x < submenuRect.right &&
      handle.right > submenuRect.x &&
      handle.y < submenuRect.bottom &&
      handle.bottom > submenuRect.y;
    if (overlaps) {
      expect(submenu.contains(onTop)).toBe(true);
    }
  });
  test("Check image toolbar", async () => {
    await focusOnEditor();
    await executeSlashCommand("image");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot(
      "ariakit-image-toolbar",
    );
  });
});
