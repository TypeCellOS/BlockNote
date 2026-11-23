import App from "@examples/01-basic/08-ariakit/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import {
  DRAG_HANDLE_SELECTOR,
  DRAG_HANDLE_MENU_SELECTOR,
  EDITOR_SELECTOR,
  LINK_BUTTON_SELECTOR,
  PARAGRAPH_SELECTOR,
} from "../../utils/const.js";
import {
  focusOnEditor,
  expectElement,
  waitForSelector,
} from "../../utils/editor.js";
import { moveMouseOverElement } from "../../utils/mouse.js";
import { executeSlashCommand, openSlashMenu } from "../../utils/slashmenu.js";
import { waitForEmojiPickerLayout } from "../../utils/emojipicker.js";

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
  await document.fonts.ready;
});

describe("Check Ariakit UI", () => {
  test("Check formatting toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph{Shift>}{Home}{/Shift}");

    await expectElement(
      await waitForSelector(".bn-formatting-toolbar"),
    ).toBeVisible();
    await expectElement(document.body).toMatchScreenshot(
      "ariakit-formatting-toolbar",
    );
  });
  test("Check link toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph{Shift>}{Home}{/Shift}");

    await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));

    await userEvent.fill(
      await waitForSelector(".bn-form-popover input[name=url]"),
      "link",
    );
    await userEvent.keyboard("{Enter}");
    await waitForSelector(
      `${EDITOR_SELECTOR} a[data-inline-content-type="link"]`,
    );
    await expect
      .poll(() => document.activeElement?.matches(EDITOR_SELECTOR))
      .toBe(true);
    await window.__blockNoteWaitForEditorFocus();
    await userEvent.keyboard("{ArrowLeft}{ArrowRight}");

    // The screenshot alone cannot catch link creation breaking: the global
    // `toMatchScreenshot` tolerance is 2% of pixels and the link toolbar covers
    // about 1% of the frame, so "no link, no toolbar" compares equal to the
    // baseline. Assert the UI exists first.
    await expectElement(
      await waitForSelector(".bn-link-toolbar"),
    ).toBeVisible();
    await expectElement(document.body).toMatchScreenshot(
      "ariakit-link-toolbar",
    );
  });
  test("Check slash menu", async () => {
    await focusOnEditor();
    await openSlashMenu();

    await expectElement(document.body).toMatchScreenshot("ariakit-slash-menu");
  });
  test("Check emoji picker", async () => {
    await focusOnEditor();
    await userEvent.keyboard(":sm");

    await waitForEmojiPickerLayout();
    await expectElement(document.body).toMatchScreenshot(
      "ariakit-emoji-picker",
    );
  });
  test("Check side menu", async () => {
    await focusOnEditor();
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    await expectElement(
      await waitForSelector(DRAG_HANDLE_SELECTOR),
    ).toBeVisible();
    await expectElement(document.body).toMatchScreenshot("ariakit-side-menu");
  });
  test("Check drag handle menu", async () => {
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    const handle = await waitForSelector(DRAG_HANDLE_SELECTOR);
    await userEvent.click(handle.closest("button")!);

    await expectElement(
      await waitForSelector(DRAG_HANDLE_MENU_SELECTOR),
    ).toBeVisible();
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
    // The pin below is only meaningful while the submenu covers the handle;
    // without this the test passes vacuously when the layout changes.
    await expect
      .poll(() => {
        const rect = handle.getBoundingClientRect();
        const submenuRect = submenu.getBoundingClientRect();
        const onTop = document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        );
        return {
          overlaps:
            rect.x < submenuRect.right &&
            rect.right > submenuRect.x &&
            rect.y < submenuRect.bottom &&
            rect.bottom > submenuRect.y,
          submenuOnTop: submenu.contains(onTop),
        };
      })
      .toEqual({ overlaps: true, submenuOnTop: true });
  });
  test("Check image toolbar", async () => {
    await focusOnEditor();
    await executeSlashCommand("image");

    await expectElement(await waitForSelector(".bn-panel")).toBeVisible();
    await expectElement(document.body).toMatchScreenshot(
      "ariakit-image-toolbar",
    );
  });
});
