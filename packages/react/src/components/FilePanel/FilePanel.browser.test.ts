import type { PartialBlock } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import type { BrowserContext } from "../../../../../tests/src/fixtures/editor.js";

const imageDocument: PartialBlock[] = [{ type: "paragraph" }];

async function openImagePanel({
  pressKey,
  focusUntil,
}: Pick<BrowserContext, "pressKey" | "focusUntil">) {
  await focusUntil(page.getByRole("textbox"));
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

describe("keyboard", () => {
  it("file panel: Embed URL input receives focus on opening", async ({
    setupEditor,
    pressKey,
    focusUntil,
  }) => {
    await setupEditor({ initialContent: imageDocument });
    const panel = await openImagePanel({ pressKey, focusUntil });
    await expect.element(panel.getByPlaceholder("Enter URL")).toHaveFocus();
  });

  it("file panel: Upload button receives focus on opening", async ({
    setupEditor,
    pressKey,
    focusUntil,
  }) => {
    await setupEditor({
      initialContent: imageDocument,
      uploadFile: async () => "/image.svg",
    });
    const panel = await openImagePanel({ pressKey, focusUntil });
    await expect
      .element(panel.getByRole("button", { name: "Upload image", exact: true }))
      .toHaveFocus();
  });
});
