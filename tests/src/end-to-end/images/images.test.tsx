import NoTrailingBlockApp from "@examples/01-basic/17-no-trailing-block/src/App";
import TestingApp from "@examples/01-basic/testing/src/App";
import { describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import {
  compareDocToSnapshot,
  expectElement,
  focusOnEditor,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import { getRect, mouseSequence } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

const IMAGE_EMBED_URL = "https://placehold.co/800x540.png";

describe("Check Image Block and Toolbar functionality", () => {
  test("Should be able to create image block", async () => {
    await render(<TestingApp />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await executeSlashCommand("image");

    await sleep(500);
    await compareDocToSnapshot("createImage");
    await expectElement(document.body).toMatchScreenshot("create-image");
  });
  test.skip("Should be able to upload image", async () => {
    await render(<TestingApp />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await executeSlashCommand("image");

    const uploadInput = (await waitForSelector(
      `[data-test="upload-input"]`,
    )) as HTMLInputElement;
    const file = new File(["placeholder"], "placeholder.png", {
      type: "image/png",
    });
    await userEvent.upload(uploadInput, file);
    await waitForSelector(`img[src^="https://tmpfiles.org/"]`);
    await sleep(500);

    await userEvent.click(await waitForSelector(`img`));

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("upload-image");
  });
  test("Should be able to embed image", async () => {
    await render(<TestingApp />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await executeSlashCommand("image");

    await userEvent.click(await waitForSelector(`[data-test="embed-tab"]`));
    await userEvent.click(await waitForSelector(`[data-test="embed-input"]`));
    await userEvent.keyboard(IMAGE_EMBED_URL);
    await userEvent.click(
      await waitForSelector(`[data-test="embed-input-button"]`),
    );
    await waitForSelector(`img[src="${IMAGE_EMBED_URL}"]`);
    await sleep(500);

    await userEvent.click(await waitForSelector(`img`));

    await sleep(500);
    await compareDocToSnapshot("embedImage");
    await expectElement(document.body).toMatchScreenshot("embed-image");
  });
  test("Should be able to resize image", async () => {
    await render(<TestingApp />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await executeSlashCommand("image");

    await userEvent.click(await waitForSelector(`[data-test="embed-tab"]`));
    await userEvent.click(await waitForSelector(`[data-test="embed-input"]`));
    await userEvent.keyboard(IMAGE_EMBED_URL);
    await userEvent.click(
      await waitForSelector(`[data-test="embed-input-button"]`),
    );
    await waitForSelector(`img[src="${IMAGE_EMBED_URL}"]`);
    await sleep(500);

    await userEvent.click(await waitForSelector(`img`));

    await waitForSelector(`[class*="bn-resize-handle"][style*="right"]`);
    const resizeHandleBoundingBox = getRect(
      `[class*="bn-resize-handle"][style*="right"]`,
    );
    await mouseSequence([
      {
        type: "move",
        x: resizeHandleBoundingBox.x + resizeHandleBoundingBox.width / 2,
        y: resizeHandleBoundingBox.y + resizeHandleBoundingBox.height / 2,
        steps: 5,
      },
      { type: "down" },
      {
        type: "move",
        x: resizeHandleBoundingBox.x + resizeHandleBoundingBox.width / 2 - 50,
        y: resizeHandleBoundingBox.y + resizeHandleBoundingBox.height / 2,
        steps: 5,
      },
      { type: "up" },
    ]);

    await sleep(500);
    await compareDocToSnapshot("resizeImage");
    await expectElement(document.body).toMatchScreenshot("resize-image");
  });
  test("Should be able to delete image with backspace", async () => {
    await render(<TestingApp />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await executeSlashCommand("image");

    await userEvent.click(await waitForSelector(`[data-test="embed-tab"]`));
    await userEvent.click(await waitForSelector(`[data-test="embed-input"]`));
    await userEvent.keyboard(IMAGE_EMBED_URL);
    await userEvent.click(
      await waitForSelector(`[data-test="embed-input-button"]`),
    );
    await waitForSelector(`img[src="${IMAGE_EMBED_URL}"]`);

    await userEvent.click(await waitForSelector(`img`));
    await userEvent.keyboard("{Backspace}");

    await compareDocToSnapshot("deleteImage");
  });
  test("Should open file panel but not formatting toolbar when inserting image with no trailing block", async () => {
    await render(<NoTrailingBlockApp />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await executeSlashCommand("image");

    const filePanel = await waitForSelector(".bn-panel");
    await expectElement(filePanel).toBeVisible();

    // The toolbar may either be absent from the DOM or present-but-hidden;
    // expectElement().not.toBeVisible() errors on null, so handle both.
    const toolbar = document.querySelector(".bn-formatting-toolbar");
    if (toolbar) {
      await expectElement(toolbar).not.toBeVisible();
    }
  });
});
