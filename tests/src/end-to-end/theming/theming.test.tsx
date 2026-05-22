import App from "@examples/01-basic/testing/src/App";
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
import { moveMouseOverElement, mouseSequence } from "../../utils/mouse.js";
import { renderEditor } from "../../utils/render.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

// TODO(migration): the Playwright version used `test.use({ colorScheme: "dark" })`
// to emulate `prefers-color-scheme: dark` so the editor renders its dark theme.
// Vitest browser mode has no direct equivalent, so the dark-theme baselines
// captured here will not be in dark mode until a dark-scheme emulation is wired
// up. Needs equivalent in Vitest browser mode.

beforeEach(async () => {
  await renderEditor(<App />);
});

describe("Check Dark Theme is Automatically Applied", () => {
  test("Should show dark editor", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");

    await matchPageScreenshot("dark-editor");
  });
  test("Should show dark formatting toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await sleep(500);
    await matchPageScreenshot("dark-formatting-toolbar");
  });
  test("Should show dark link toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));

    await sleep(500);
    await userEvent.keyboard("link");
    await userEvent.keyboard("{Enter}");
    await sleep(500);
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowRight}");

    await sleep(500);
    await matchPageScreenshot("dark-link-toolbar");
  });
  test("Should show dark slash menu", async () => {
    await focusOnEditor();
    await userEvent.keyboard("/");

    await sleep(500);
    await matchPageScreenshot("dark-slash-menu");
  });
  test("Should show dark emoji picker", async () => {
    await focusOnEditor();
    await userEvent.keyboard(":");
    await userEvent.keyboard("sm");

    await sleep(500);
    await matchPageScreenshot("dark-emoji-picker");
  });
  test("Should show dark side menu", async () => {
    await focusOnEditor();
    await waitForSelector(PARAGRAPH_SELECTOR);
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    await sleep(500);
    await matchPageScreenshot("dark-side-menu");
  });
  test("Should show drag handle menu", async () => {
    await focusOnEditor();
    await waitForSelector(PARAGRAPH_SELECTOR);
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    await sleep(500);
    await waitForSelector(DRAG_HANDLE_SELECTOR);
    await moveMouseOverElement(DRAG_HANDLE_SELECTOR);
    await mouseSequence([{ type: "down" }, { type: "up" }]);

    await sleep(500);
    await matchPageScreenshot("dark-drag-handle-menu");
  });
  test("Should show dark image toolbar", async () => {
    await focusOnEditor();
    await executeSlashCommand("image");

    await sleep(500);
    await matchPageScreenshot("dark-image-toolbar");
  });
});
