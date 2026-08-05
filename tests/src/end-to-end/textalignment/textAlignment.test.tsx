import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import {
  ALIGN_TEXT_RIGHT_BUTTON_SELECTOR,
  EDITOR_SELECTOR,
} from "../../utils/const.js";
import { insertHeading } from "../../utils/copypaste.js";
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

    await expectElement(document.body).toMatchScreenshot(
      "alignTextSingleBlock",
    );
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

    await expectElement(document.body).toMatchScreenshot(
      "alignTextMultipleBlocks",
    );
  });
});
