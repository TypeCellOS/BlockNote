import App from "@examples/01-basic/09-shadcn/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

// The shadcn example's `main.tsx` (which we don't load in tests) imports this
// to bootstrap Tailwind v4 + the ShadCN theme variables. Without it the
// ShadCN UI components render unstyled (no popovers, no borders, no theme).
import shadcnStyles from "../../../../examples/01-basic/09-shadcn/tailwind.css?inline";
import { useBrowserSuiteStyles } from "../../commands/browser/useBrowserSuiteStyles.js";
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
  waitForSelector,
} from "../../utils/editor.js";
import {
  clickAt,
  getRect,
  mouseSequence,
  moveMouseOverElement,
} from "../../utils/mouse.js";
import { executeSlashCommand, openSlashMenu } from "../../utils/slashmenu.js";
import { waitForEmojiPickerLayout } from "../../utils/emojipicker.js";

useBrowserSuiteStyles(shadcnStyles);

// ShadCN portals the dropdown outside .bn-side-menu.
const DRAG_HANDLE_MENU_SELECTOR = ".bn-drag-handle-menu";

async function waitForMenuUpdates() {
  // Base UI schedules mouse-down opening in an animation frame. Wait through
  // the following frame so absence assertions also observe deferred updates.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
  await document.fonts.ready;
});

describe("Check ShadCN UI", () => {
  test("Check formatting toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph{Shift>}{Home}{/Shift}");

    await expectElement(
      await waitForSelector(".bn-formatting-toolbar"),
    ).toBeVisible();
    await expectElement(document.body).toMatchScreenshot(
      "shadcn-formatting-toolbar",
    );
  });
  test("Check link toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph{Shift>}{Home}{/Shift}");

    const linkButton = await waitForSelector(LINK_BUTTON_SELECTOR);
    const linkButtonRect = getRect(linkButton);
    await clickAt(linkButtonRect.x + 5, linkButtonRect.y + 5);

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

    // A missing link toolbar stays within the 2% screenshot tolerance, so
    // assert it exists before comparing (see the ariakit test).
    await expectElement(
      await waitForSelector(".bn-link-toolbar"),
    ).toBeVisible();
    await expectElement(document.body).toMatchScreenshot("shadcn-link-toolbar");
  });
  test("Check slash menu", async () => {
    await focusOnEditor();
    await openSlashMenu();

    await expectElement(document.body).toMatchScreenshot("shadcn-slash-menu");
  });
  test("Check emoji picker", async () => {
    await focusOnEditor();
    await userEvent.keyboard(":sm");

    await waitForEmojiPickerLayout();
    await expectElement(document.body).toMatchScreenshot("shadcn-emoji-picker");
  });
  test("Check side menu", async () => {
    await focusOnEditor();
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    await expectElement(
      await waitForSelector(DRAG_HANDLE_SELECTOR),
    ).toBeVisible();
    await expectElement(document.body).toMatchScreenshot("shadcn-side-menu");
  });
  test("Check drag handle menu", async () => {
    await focusOnEditor();
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    const handle = await waitForSelector(DRAG_HANDLE_SELECTOR);
    await userEvent.click(handle.closest("button")!);

    await expectElement(
      await waitForSelector(DRAG_HANDLE_MENU_SELECTOR),
    ).toBeVisible();
    await expectElement(document.body).toMatchScreenshot(
      "shadcn-drag-handle-menu",
    );
  });
  test("Drag handle menu opens on release instead of press", async () => {
    await focusOnEditor();
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    const dragHandle = await waitForSelector(DRAG_HANDLE_SELECTOR);
    await moveMouseOverElement(dragHandle);
    await mouseSequence([{ type: "down" }]);

    await waitForMenuUpdates();
    expect(document.querySelector(DRAG_HANDLE_MENU_SELECTOR)).toBeNull();

    await mouseSequence([{ type: "up" }]);
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
  });
  test.each(["click", "Enter", "Space"] as const)(
    "Dragging keeps the menu closed and allows a subsequent %s",
    async (activation) => {
      await focusOnEditor();
      await moveMouseOverElement(PARAGRAPH_SELECTOR);

      const dragHandle = await waitForSelector(DRAG_HANDLE_SELECTOR);
      const dragHandleButton = dragHandle.closest("button");
      if (!dragHandleButton) {
        throw new Error("Drag handle button not found");
      }
      const onDragStart = vi.fn();
      dragHandleButton.addEventListener("dragstart", onDragStart, {
        once: true,
      });
      const dragHandleRect = getRect(dragHandle);
      const x = dragHandleRect.x + dragHandleRect.width / 2;
      const y = dragHandleRect.y + dragHandleRect.height / 2;
      await mouseSequence([
        { type: "move", x, y },
        { type: "down" },
        { type: "move", x: x + 20, y: y + 20, steps: 5 },
      ]);

      expect(onDragStart).toHaveBeenCalledOnce();
      await waitForMenuUpdates();
      expect(document.querySelector(DRAG_HANDLE_MENU_SELECTOR)).toBeNull();

      // Release over the trigger itself: a mouse-up there must not be treated
      // as a click after a drag, even when the block ends up in the same place.
      await mouseSequence([{ type: "move", x, y, steps: 5 }, { type: "up" }]);
      await waitForMenuUpdates();
      expect(document.querySelector(DRAG_HANDLE_MENU_SELECTOR)).toBeNull();

      await moveMouseOverElement(PARAGRAPH_SELECTOR);
      const dragHandleAfterDragging =
        await waitForSelector(DRAG_HANDLE_SELECTOR);
      const buttonAfterDragging = dragHandleAfterDragging.closest("button");
      if (!buttonAfterDragging) {
        throw new Error("Drag handle button not found");
      }
      switch (activation) {
        case "click":
          await moveMouseOverElement(buttonAfterDragging);
          await mouseSequence([{ type: "down" }, { type: "up" }]);
          break;
        case "Enter":
          buttonAfterDragging.focus();
          await userEvent.keyboard("{Enter}");
          break;
        case "Space":
          buttonAfterDragging.focus();
          await userEvent.keyboard(" ");
          break;
      }
      await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    },
  );
  test("Check image toolbar", async () => {
    await focusOnEditor();
    await executeSlashCommand("image");

    await expectElement(await waitForSelector(".bn-panel")).toBeVisible();
    await expectElement(document.body).toMatchScreenshot(
      "shadcn-image-toolbar",
    );
  });
});
