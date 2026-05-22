import NoTrailingBlockApp from "@examples/01-basic/17-no-trailing-block/src/App";
import TestingApp from "@examples/01-basic/testing/src/App";
import { describe, expect, test } from "vite-plus/test";
import { userEvent } from "../../utils/context.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  matchPageScreenshot,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import { getRect, mouseSequence } from "../../utils/mouse.js";
import { renderEditor } from "../../utils/render.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

// `expect.element` is augmented against the bare `vitest` module, but vite-plus
// types `expect` from an internal module, so the augmentation doesn't attach.
// Type the accessor locally.
type ElementMatchers = {
  toBeVisible(): Promise<void>;
  not: { toBeVisible(): Promise<void> };
};
type ElementExpect = (element: Element | null) => ElementMatchers;
const expectElement = (expect as unknown as { element: ElementExpect }).element;

const IMAGE_EMBED_URL = "https://placehold.co/800x540.png";

describe("Check Image Block and Toolbar functionality", () => {
  test("Should be able to create image block", async () => {
    await renderEditor(<TestingApp />);
    await focusOnEditor();
    await executeSlashCommand("image");

    await sleep(500);
    await compareDocToSnapshot("createImage");
    await matchPageScreenshot("create-image");
  });
  test.skip("Should be able to upload image", async () => {
    await renderEditor(<TestingApp />);
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
    await matchPageScreenshot("upload-image");
  });
  test("Should be able to embed image", async () => {
    await renderEditor(<TestingApp />);
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
    await matchPageScreenshot("embed-image");
  });
  test("Should be able to resize image", async () => {
    await renderEditor(<TestingApp />);
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
    await matchPageScreenshot("resize-image");
  });
  test("Should be able to delete image with backspace", async () => {
    await renderEditor(<TestingApp />);
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
    await renderEditor(<NoTrailingBlockApp />);
    await focusOnEditor();
    await executeSlashCommand("image");

    const filePanel = await waitForSelector(".bn-panel");
    await expectElement(filePanel).toBeVisible();

    await expectElement(
      document.querySelector(".bn-formatting-toolbar"),
    ).not.toBeVisible();
  });
});
