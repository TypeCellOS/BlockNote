import { expect, test } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { openEditor, pressKey } from "@root/tests/a11y/helpers.js";

async function openImagePanel() {
  await pressKey("Tab");
  await expect.element(page.getByRole("textbox")).toHaveFocus();
  await userEvent.keyboard("/image");
  await expect
    .element(page.getByRole("option", { name: /Image/ }))
    .toBeVisible();
  await pressKey("Enter");
  const panel = page.elementLocator(
    document.querySelector<HTMLElement>(".bn-panel")!,
  );
  await expect.element(panel).toBeVisible();
  return panel;
}

test("file panel: Embed URL input receives focus on opening", async () => {
  await openEditor([{ type: "paragraph" }]);
  const panel = await openImagePanel();
  await expect.element(panel.getByPlaceholder("Enter URL")).toHaveFocus();
  await expect.element(panel).toMatchScreenshot("focus-embed-url.png", {});
});

test("file panel: Upload button receives focus on opening", async () => {
  await openEditor([{ type: "paragraph" }], {
    uploadFile: async () => "/image.svg",
  });
  const panel = await openImagePanel();
  await expect
    .element(panel.getByRole("button", { name: "Upload image", exact: true }))
    .toHaveFocus();
  await expect.element(panel).toMatchScreenshot("focus-upload-button.png", {});
});
