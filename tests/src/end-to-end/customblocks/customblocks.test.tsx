import ReactCustomBlocksApp from "@examples/06-custom-schema/react-custom-blocks/src/App";
import VanillaCustomBlocksApp from "@examples/vanilla-js/react-vanilla-custom-blocks/src/App";
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { commands, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { expectElement, waitForSelector } from "../../utils/editor.js";

function expectCustomBlocks(imageUrl: string) {
  const blocks = [
    ...document.querySelectorAll<HTMLElement>(
      `${EDITOR_SELECTOR} .bn-block-content[data-content-type]`,
    ),
  ];
  expect(blocks.map((block) => block.dataset.contentType)).toEqual([
    "alert",
    "simpleImage",
    "bracketsParagraph",
  ]);
  expect(blocks[0].dataset.type).toBe("info");
  expect(blocks[0].querySelector("select")?.value).toBe("info");
  expect(blocks[0].querySelector(".bn-inline-content")?.textContent).toBe(
    "Alert",
  );
  expect(blocks[1].querySelector("img")?.getAttribute("src")).toBe(imageUrl);
  expect(blocks[2].querySelector(".bn-inline-content")?.textContent).toBe(
    "Brackets Paragraph",
  );
}

describe("Check custom block functionality", () => {
  beforeAll(() => commands.mockCustomBlockImages("install"));
  afterAll(() => commands.mockCustomBlockImages("remove"));

  async function waitForImage() {
    await expect
      .poll(
        () =>
          document.querySelector<HTMLImageElement>("img.simple-image")
            ?.naturalWidth ?? 0,
      )
      .toBeGreaterThan(0);
  }

  async function changeAlertToInfo() {
    await userEvent.selectOptions(
      await waitForSelector(".alert select"),
      "info",
    );
    // The select's value changes before the editor updates its block. Wait for
    // the node view to render the new prop before checking either baseline.
    await waitForSelector('[data-content-type="alert"][data-type="info"]');
  }

  test("Should be able to interactively update vanilla custom blocks", async () => {
    await render(<VanillaCustomBlocksApp />);

    await changeAlertToInfo();

    expectCustomBlocks("https://placehold.co/800x540.png");
    await Promise.all([waitForImage(), document.fonts.ready]);
    await expectElement(document.body).toMatchScreenshot(
      "vanilla-interactivity",
    );
  });

  test("Should be able to interactively update React custom blocks", async () => {
    await render(<ReactCustomBlocksApp />);
    await changeAlertToInfo();

    expectCustomBlocks("https://placehold.co/332x322.jpg");
    await Promise.all([waitForImage(), document.fonts.ready]);
    await expectElement(document.body).toMatchScreenshot("react-interactivity");
  });
});
