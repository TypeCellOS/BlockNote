import App from "@examples/01-basic/09-shadcn/src/App";
// The shadcn example's `main.tsx` (which we don't load in tests) imports this
// to bootstrap Tailwind v4 + the ShadCN theme variables. Without it the
// ShadCN UI components render unstyled (no popovers, no borders, no theme).
import "@examples/01-basic/09-shadcn/tailwind.css";
import { beforeEach, describe, test } from "vite-plus/test";
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
import {
  clickAt,
  getRect,
  mouseSequence,
  moveMouseOverElement,
} from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

beforeEach(async () => {
  render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Check ShadCN UI", () => {
  test("Check formatting toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot(
      "shadcn-formatting-toolbar",
    );
  });
  test("Check link toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    const linkButton = await waitForSelector(LINK_BUTTON_SELECTOR);
    const linkButtonRect = getRect(linkButton);
    await clickAt(linkButtonRect.x + 5, linkButtonRect.y + 5);

    await userEvent.keyboard("link");
    await userEvent.keyboard("{Enter}");
    await sleep(500);
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowRight}");

    await sleep(700);
    await expectElement(document.body).toMatchScreenshot("shadcn-link-toolbar");
  });
  test("Check slash menu", async () => {
    await focusOnEditor();
    await userEvent.keyboard("/");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("shadcn-slash-menu");
  });
  test("Check emoji picker", async () => {
    await focusOnEditor();
    await userEvent.keyboard(":");
    await userEvent.keyboard("sm");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("shadcn-emoji-picker");
  });
  test("Check side menu", async () => {
    await focusOnEditor();
    await waitForSelector(PARAGRAPH_SELECTOR);
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("shadcn-side-menu");
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
      "shadcn-drag-handle-menu",
    );
  });
  test("Check image toolbar", async () => {
    await focusOnEditor();
    await executeSlashCommand("image");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot(
      "shadcn-image-toolbar",
    );
  });
});
