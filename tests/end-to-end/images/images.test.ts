import { test } from "../../setup/setupScript";
import {
  BASE_URL,
  H_ONE_BLOCK_SELECTOR,
  IMAGE_SELECTOR,
} from "../../utils/const";
import { compareDocToSnapshot, focusOnEditor } from "../../utils/editor";
import { expect, FileChooser } from "@playwright/test";
import { dragAndDropBlock } from "../../utils/mouse";
import { executeSlashCommand } from "../../utils/slashmenu";
import { insertHeading } from "../../utils/copypaste";

const IMAGE_UPLOAD_PATH = "tests/end-to-end/images/placeholder.png";
const IMAGE_EMBED_URL =
  "https://www.pulsecarshalton.co.uk/wp-content/uploads/2016/08/jk-placeholder-image.jpg";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Check Image Block and Toolbar functionality", () => {
  test("Should be able to create image block", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "image");

    await page.waitForTimeout(500);
    await compareDocToSnapshot(page, "createImage");
    expect(await page.screenshot()).toMatchSnapshot("create-image.png");
  });
  test("Should be able to upload image", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "image");

    page.on("filechooser", (fileChooser: FileChooser) => {
      fileChooser.setFiles([IMAGE_UPLOAD_PATH]);
    });
    await page.click(`[data-test="upload-input"]`);
    await page.waitForSelector(`img[src^="https://tmpfiles.org/"]`);

    await page.click(`img`);

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("upload-image.png");
  });
  test("Should be able to embed image", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "image");

    await page.click(`[data-test="embed-tab"]`);
    await page.click(`[data-test="embed-input"]`);
    await page.keyboard.type(IMAGE_EMBED_URL);
    await page.click(`[data-test="embed-input-button"]`);
    await page.waitForSelector(`img[src="${IMAGE_EMBED_URL}"]`);

    await page.click(`img`);

    await page.waitForTimeout(500);
    await compareDocToSnapshot(page, "embedImage");
    expect(await page.screenshot()).toMatchSnapshot("embed-image.png");
  });
  test("Should be able to resize image", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "image");

    await page.click(`[data-test="embed-tab"]`);
    await page.click(`[data-test="embed-input"]`);
    await page.keyboard.type(IMAGE_EMBED_URL);
    await page.click(`[data-test="embed-input-button"]`);
    await page.waitForSelector(`img[src="${IMAGE_EMBED_URL}"]`);

    await page.click(`img`);

    await page.waitForSelector(`[class*="resizeHandle"][style*="right"]`);
    const resizeHandle = page.locator(
      `[class*="resizeHandle"][style*="right"]`
    );
    const resizeHandleBoundingBox = await resizeHandle.boundingBox();
    await page.mouse.move(
      resizeHandleBoundingBox.x + resizeHandleBoundingBox.width / 2,
      resizeHandleBoundingBox.y + resizeHandleBoundingBox.height / 2,
      {
        steps: 5,
      }
    );
    await page.mouse.down();

    await page.mouse.move(
      resizeHandleBoundingBox.x + resizeHandleBoundingBox.width / 2 - 50,
      resizeHandleBoundingBox.y + resizeHandleBoundingBox.height / 2,
      {
        steps: 5,
      }
    );

    await page.mouse.up();

    await page.click(`img`);

    await page.waitForTimeout(500);
    await compareDocToSnapshot(page, "resizeImage");
    expect(await page.screenshot()).toMatchSnapshot("resize-image.png");
  });
  test("Should be able to delete image with backspace", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "image");

    await page.click(`[data-test="embed-tab"]`);
    await page.click(`[data-test="embed-input"]`);
    await page.keyboard.type(IMAGE_EMBED_URL);
    await page.click(`[data-test="embed-input-button"]`);
    await page.waitForSelector(`img[src="${IMAGE_EMBED_URL}"]`);

    await page.click(`img`);
    await page.keyboard.press("Backspace");

    await compareDocToSnapshot(page, "deleteImage");
  });
  test("Should be able to drag image", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "image");

    await insertHeading(page, 1);

    const dragTarget = await page.locator(IMAGE_SELECTOR);
    const dropTarget = await page.locator(H_ONE_BLOCK_SELECTOR);
    await page.pause();
    await dragAndDropBlock(page, dragTarget, dropTarget, false);

    await compareDocToSnapshot(page, "dragImage");
  });
});
