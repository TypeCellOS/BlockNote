import type { PartialBlock } from "@blocknote/core";
import { expect, test } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { openEditor, pressKey } from "@root/tests/a11y/helpers.js";

const imageDocument: PartialBlock[] = [{ type: "paragraph" }];

async function openImagePanel() {
  await pressKey("Tab");
  await expect.element(page.getByRole("textbox")).toHaveFocus();
  await userEvent.keyboard("/image");
  await expect
    .element(page.getByRole("option", { name: /Image/ }))
    .toBeVisible();
  await pressKey("Enter");
  const panel = page.getByRole("tabpanel");
  await expect.element(panel).toBeVisible();
  return panel;
}

test.describe("keyboard", () => {
  test("file panel: Embed URL input receives focus on opening", async () => {
    await openEditor(imageDocument);
    const panel = await openImagePanel();
    await expect.element(panel.getByPlaceholder("Enter URL")).toHaveFocus();
  });

  test("file panel: Upload button receives focus on opening", async () => {
    await openEditor(imageDocument, {
      uploadFile: async () => "/image.svg",
    });
    const panel = await openImagePanel();
    await expect
      .element(panel.getByRole("button", { name: "Upload image", exact: true }))
      .toHaveFocus();
  });
});
