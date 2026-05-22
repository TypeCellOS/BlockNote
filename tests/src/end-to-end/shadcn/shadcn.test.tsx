import App from "@examples/01-basic/09-shadcn/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { userEvent } from "../../utils/context.js";
import {
  DRAG_HANDLE_SELECTOR,
  LINK_BUTTON_SELECTOR,
  PARAGRAPH_SELECTOR,
} from "../../utils/const.js";
import {
  focusOnEditor,
  matchPageScreenshot,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import {
  clickAt,
  getRect,
  mouseSequence,
  moveMouseOverElement,
} from "../../utils/mouse.js";
import { renderEditor } from "../../utils/render.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

beforeEach(async () => {
  await renderEditor(<App />);
});

describe("Check ShadCN UI", () => {
  test("Check formatting toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await sleep(500);
    await matchPageScreenshot("shadcn-formatting-toolbar");
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
    await matchPageScreenshot("shadcn-link-toolbar");
  });
  test("Check slash menu", async () => {
    await focusOnEditor();
    await userEvent.keyboard("/");

    await sleep(500);
    await matchPageScreenshot("shadcn-slash-menu");
  });
  test("Check emoji picker", async () => {
    await focusOnEditor();
    await userEvent.keyboard(":");
    await userEvent.keyboard("sm");

    await sleep(500);
    await matchPageScreenshot("shadcn-emoji-picker");
  });
  test("Check side menu", async () => {
    await focusOnEditor();
    await waitForSelector(PARAGRAPH_SELECTOR);
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    await sleep(500);
    await matchPageScreenshot("shadcn-side-menu");
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
    await matchPageScreenshot("shadcn-drag-handle-menu");
  });
  test("Check image toolbar", async () => {
    await focusOnEditor();
    await executeSlashCommand("image");

    await sleep(500);
    await matchPageScreenshot("shadcn-image-toolbar");
  });
});
