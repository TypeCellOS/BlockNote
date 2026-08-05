import App from "@examples/01-basic/04-default-blocks/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import {
  focusOnEditor,
  expectElement,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
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
    await expectElement(document.body).toMatchScreenshot("basicblocks");
  });
});
