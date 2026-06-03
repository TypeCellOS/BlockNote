import ReactCustomBlocksApp from "@examples/06-custom-schema/react-custom-blocks/src/App";
import VanillaCustomBlocksApp from "@examples/vanilla-js/react-vanilla-custom-blocks/src/App";
import { describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import {
  compareDocToSnapshot,
  expectElement,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";

describe("Check custom block functionality", () => {
  test("Should be able to interactively update vanilla custom blocks", async () => {
    await render(<VanillaCustomBlocksApp />);
    await waitForSelector(EDITOR_SELECTOR);

    await userEvent.selectOptions(await waitForSelector("select"), "info");
    await sleep(500);

    await compareDocToSnapshot("vanillaInteractivity");
    await expectElement(document.body).toMatchScreenshot(
      "vanilla-interactivity",
    );
  });

  test("Should be able to interactively update React custom blocks", async () => {
    await render(<ReactCustomBlocksApp />);
    await waitForSelector(EDITOR_SELECTOR);

    await userEvent.selectOptions(await waitForSelector("select"), "info");
    await sleep(500);

    await compareDocToSnapshot("reactInteractivity");
    await expectElement(document.body).toMatchScreenshot("react-interactivity");
  });
});
