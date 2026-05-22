import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { userEvent } from "../../utils/context.js";
import { ALIGN_TEXT_RIGHT_BUTTON_SELECTOR } from "../../utils/const.js";
import { insertHeading } from "../../utils/copypaste.js";
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

describe("Check Text Alignment Functionality", () => {
  test("Should be able to set text alignment on single block", async () => {
    await focusOnEditor();

    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Control>}{ArrowLeft}{/Control}");
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");

    await userEvent.click(
      await waitForSelector(ALIGN_TEXT_RIGHT_BUTTON_SELECTOR),
    );
    await sleep(350);

    await userEvent.keyboard("{Escape}");
    // Waits for formatting toolbar animation to finish.
    await sleep(500);
    await userEvent.keyboard("{ArrowLeft}");

    await matchPageScreenshot("alignTextSingleBlock");
  });
  test("Should be able to set text alignment on multiple blocks", async () => {
    await focusOnEditor();

    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Control>}{ArrowLeft}{/Control}");
    await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}");
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");

    await userEvent.click(
      await waitForSelector(ALIGN_TEXT_RIGHT_BUTTON_SELECTOR),
    );
    await sleep(350);

    await userEvent.keyboard("{Escape}");
    // Waits for formatting toolbar animation to finish.
    await sleep(500);
    await userEvent.keyboard("{ArrowLeft}");

    await matchPageScreenshot("alignTextMultipleBlocks");
  });
});
