import ReactCustomBlocksApp from "@examples/06-custom-schema/react-custom-blocks/src/App";
import VanillaCustomBlocksApp from "@examples/vanilla-js/react-vanilla-custom-blocks/src/App";
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { commands, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import {
  compareDocToSnapshot,
  expectElement,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";

describe("Check custom block functionality", () => {
  const imageCommands = commands as unknown as {
    mockCustomBlockImages(action: "install" | "remove"): Promise<void>;
  };
  beforeAll(() => imageCommands.mockCustomBlockImages("install"));
  afterAll(() => imageCommands.mockCustomBlockImages("remove"));

  async function waitForImage() {
    await expect
      .poll(
        () =>
          document.querySelector<HTMLImageElement>("img.simple-image")
            ?.naturalWidth ?? 0,
      )
      .toBeGreaterThan(0);
  }

  test("Should be able to interactively update vanilla custom blocks", async () => {
    await render(<VanillaCustomBlocksApp />);
    await waitForSelector(EDITOR_SELECTOR);

    await userEvent.selectOptions(await waitForSelector("select"), "info");
    await sleep(500);

    await compareDocToSnapshot("vanillaInteractivity");
    await waitForImage();
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
    await waitForImage();
    await expectElement(document.body).toMatchScreenshot("react-interactivity");
  });
});
