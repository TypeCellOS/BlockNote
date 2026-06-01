import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import {
  EDITOR_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  NEST_BLOCK_BUTTON_SELECTOR,
  UNNEST_BLOCK_BUTTON_SELECTOR,
} from "../../utils/const.js";
import { insertHeading, insertParagraph } from "../../utils/copypaste.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import { clickAt, getRect } from "../../utils/mouse.js";

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Check Block Indentation Functionality", () => {
  test("Should be able to increase indentation for single block", async () => {
    await focusOnEditor();

    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);

    const { x, y, height } = getRect(H_TWO_BLOCK_SELECTOR);

    await clickAt(x + 10, y + height / 2, 2);

    await userEvent.click(await waitForSelector(NEST_BLOCK_BUTTON_SELECTOR));

    await sleep(350);
    await clickAt(x + 10, y + height / 2);

    // Waits for formatting toolbar animation to finish.
    await sleep(500);

    await compareDocToSnapshot("increaseIndentSingleBlock");
  });
  test("Should be able to decrease indentation for single block", async () => {
    await focusOnEditor();

    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);

    const { x, y, height } = getRect(H_TWO_BLOCK_SELECTOR);

    await clickAt(x + 10, y + height / 2, 2);

    await userEvent.click(await waitForSelector(UNNEST_BLOCK_BUTTON_SELECTOR));

    await sleep(350);
    await clickAt(x + 10, y + height / 2);

    // Waits for formatting toolbar animation to finish.
    await sleep(500);

    await compareDocToSnapshot("decreaseIndentSingleBlock");
  });
  test("Should be able to increase indentation for multiple blocks", async () => {
    await focusOnEditor();

    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);

    const firstElementBoundingBox = getRect(H_TWO_BLOCK_SELECTOR);
    await clickAt(
      firstElementBoundingBox.x + 20,
      firstElementBoundingBox.y + firstElementBoundingBox.height / 2,
    );

    const secondElementBoundingBox = getRect(H_THREE_BLOCK_SELECTOR);
    await userEvent.keyboard("{Shift>}");
    await clickAt(
      secondElementBoundingBox.x + 20,
      secondElementBoundingBox.y + secondElementBoundingBox.height / 2,
    );
    await userEvent.keyboard("{/Shift}");

    await userEvent.click(await waitForSelector(NEST_BLOCK_BUTTON_SELECTOR));

    await sleep(350);
    await clickAt(
      secondElementBoundingBox.x + secondElementBoundingBox.width - 20,
      secondElementBoundingBox.y + secondElementBoundingBox.height / 2,
    );

    // Waits for formatting toolbar animation to finish.
    await sleep(500);

    await compareDocToSnapshot("increaseIndentMultipleBlocks");
  });
  test("Should be able to decrease indentation for multiple blocks", async () => {
    await focusOnEditor();

    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);

    const firstElementBoundingBox = getRect(H_TWO_BLOCK_SELECTOR);
    await clickAt(
      firstElementBoundingBox.x + 20,
      firstElementBoundingBox.y + firstElementBoundingBox.height / 2,
    );

    const secondElementBoundingBox = getRect(H_THREE_BLOCK_SELECTOR);
    await userEvent.keyboard("{Shift>}");
    await clickAt(
      secondElementBoundingBox.x + 20,
      secondElementBoundingBox.y + secondElementBoundingBox.height / 2,
    );
    await userEvent.keyboard("{/Shift}");

    await userEvent.click(await waitForSelector(UNNEST_BLOCK_BUTTON_SELECTOR));

    await sleep(350);
    await clickAt(
      secondElementBoundingBox.x + secondElementBoundingBox.width - 20,
      secondElementBoundingBox.y + secondElementBoundingBox.height / 2,
    );

    // Waits for formatting toolbar animation to finish.
    await sleep(500);

    await compareDocToSnapshot("decreaseIndentMultipleBlocks");
  });
});
