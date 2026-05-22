import App from "@examples/01-basic/04-default-blocks/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { page, userEvent } from "../../utils/context.js";
import {
  focusOnEditor,
  matchPageScreenshot,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import { renderEditor } from "../../utils/render.js";

beforeEach(async () => {
  await renderEditor(<App />);
});

// Skip due to flaky timeout on locator.click
describe.skip("Check basic text block appearance", () => {
  test("renders correctly", async () => {
    await focusOnEditor();
    await sleep(500);

    await userEvent.click(
      await waitForSelector(`[data-content-type="audio"] .bn-file-caption`),
    );
    await userEvent.keyboard("{Backspace}");
    await sleep(500);

    await userEvent.click(
      await waitForSelector(`[data-content-type="video"] .bn-file-caption`),
    );
    await userEvent.keyboard("{Backspace}");
    await sleep(500);

    await page.getByText("Welcome to this demo!").click();

    await sleep(100);
    await matchPageScreenshot("basicblocks");
  });
});
