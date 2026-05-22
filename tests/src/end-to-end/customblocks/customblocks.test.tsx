import ReactCustomBlocksApp from "@examples/06-custom-schema/react-custom-blocks/src/App";
import VanillaCustomBlocksApp from "@examples/vanilla-js/react-vanilla-custom-blocks/src/App";
import { describe, test } from "vite-plus/test";
import { userEvent } from "../../utils/context.js";
import {
  compareDocToSnapshot,
  matchPageScreenshot,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import { renderEditor } from "../../utils/render.js";

describe("Check custom block functionality", () => {
  test("Should be able to interactively update vanilla custom blocks", async () => {
    await renderEditor(<VanillaCustomBlocksApp />);

    await userEvent.selectOptions(await waitForSelector("select"), "info");
    await sleep(500);

    await compareDocToSnapshot("vanillaInteractivity");
    await matchPageScreenshot("vanilla-interactivity");
  });

  test("Should be able to interactively update React custom blocks", async () => {
    await renderEditor(<ReactCustomBlocksApp />);

    await userEvent.selectOptions(await waitForSelector("select"), "info");
    await sleep(500);

    await compareDocToSnapshot("reactInteractivity");
    await matchPageScreenshot("react-interactivity");
  });
});
