import "@blocknote/core/fonts/inter.css";
import TestingApp from "@examples/01-basic/testing/src/App";
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { commands, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import {
  expectElement,
  focusOnEditor,
  sleep,
  waitForSelector,
  waitForSelectorDetached,
} from "../../utils/editor.js";
import {
  getRect,
  mouseSequence,
  moveMouseOverElement,
} from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

// The browser setup installs this fixture but sits outside tests/tsconfig.json.
const IMAGE_EMBED_URL = "https://placehold.co/800x540.png";
const EMBEDDED_IMAGE = [
  {
    id: "0",
    type: "image",
    props: { name: "800x540.png", url: IMAGE_EMBED_URL },
  },
  { id: "1", type: "paragraph" },
] as const;
const FORMATTING_TOOLBAR = ".bn-formatting-toolbar";

async function unexpectedUpload(): Promise<never> {
  throw new Error("This test must not upload a file");
}

async function waitForEmbeddedImage() {
  const selector = `img[src="${IMAGE_EMBED_URL}"]`;
  await expect
    .poll(() => {
      const image = document.querySelector<HTMLImageElement>(selector);
      return image?.complete && image.naturalWidth > 0;
    })
    .toBe(true);
  return waitForSelector(selector);
}

async function submitImageUrl() {
  await userEvent.click(await waitForSelector(`[data-test="embed-tab"]`));
  await userEvent.fill(
    await waitForSelector(`[data-test="embed-input"]`),
    IMAGE_EMBED_URL,
  );
  await userEvent.click(
    await waitForSelector(`[data-test="embed-input-button"]`),
  );
}

describe("Check Image Block and Toolbar functionality", () => {
  beforeAll(() => commands.mockCustomBlockImages("install"));
  afterAll(() => commands.mockCustomBlockImages("remove"));

  it("Should be able to create image block", async ({ setupEditor }) => {
    const { editor } = await setupEditor({ uploadFile: unexpectedUpload });
    await focusOnEditor();
    await executeSlashCommand("image");

    await expectElement(await waitForSelector(".bn-panel")).toBeVisible();
    await document.fonts.ready;
    expect(editor.document).toMatchObject([
      {
        type: "image",
        props: { name: "", url: "", showPreview: true },
        children: [],
      },
      { type: "paragraph", content: [], children: [] },
    ]);
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
    await waitForSelector(`img[src^="data:"]`);
    await sleep(500);

    await userEvent.click(await waitForSelector(`img`));

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("upload-image");
  });
  it("Should be able to embed image", async ({ setupEditor }) => {
    const { editor } = await setupEditor({
      initialContent: [{ id: "0", type: "image" }, EMBEDDED_IMAGE[1]],
      // Keep Upload as the default tab, as in the testing example.
      uploadFile: unexpectedUpload,
    });
    const trailingParagraph = editor.document[1];
    // Creating the empty image is covered separately. Start from it while
    // still opening the panel and submitting the URL through the real UI.
    editor.setTextCursorPosition("0");
    editor.focus();
    await window.__blockNoteWaitForEditorFocus();
    await userEvent.click(await waitForSelector(".bn-add-file-button"));

    await submitImageUrl();
    await waitForSelectorDetached(".bn-panel");
    await userEvent.click(await waitForEmbeddedImage());
    await expectElement(
      await waitForSelector(FORMATTING_TOOLBAR),
    ).toBeVisible();
    await document.fonts.ready;
    expect(editor.document).toMatchObject([
      {
        ...EMBEDDED_IMAGE[0],
        props: { ...EMBEDDED_IMAGE[0].props, showPreview: true },
        children: [],
      },
      trailingParagraph,
    ]);
    await expectElement(document.body).toMatchScreenshot("embed-image");
  });
  it("Should be able to resize image", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [...EMBEDDED_IMAGE],
    });
    const before = editor.document;
    const image = await waitForEmbeddedImage();
    editor.setTextCursorPosition("0");
    editor.focus();
    await expectElement(
      await waitForSelector(FORMATTING_TOOLBAR),
    ).toBeVisible();
    await moveMouseOverElement(image);

    const resizeHandle = await waitForSelector(
      `.bn-resize-handle[style*="right"]`,
    );
    await expectElement(resizeHandle).toBeVisible();
    const resizeHandleBoundingBox = getRect(resizeHandle);
    const x = resizeHandleBoundingBox.x + resizeHandleBoundingBox.width / 2;
    const y = resizeHandleBoundingBox.y + resizeHandleBoundingBox.height / 2;
    const originalWidth = getRect(image).width;
    const owner = crypto.randomUUID();
    onTestFinished(() => mouseSequence([{ type: "cancel", owner }]));
    await mouseSequence([
      { type: "move", x, y, steps: 5 },
      { type: "down", owner },
    ]);
    try {
      await mouseSequence([{ type: "move", x: x - 50, y, steps: 5, owner }]);
      // Mouseup persists the last rendered width, not the mouse coordinates.
      await expect.poll(() => getRect(image).width).toBeLessThan(originalWidth);
    } finally {
      await mouseSequence([{ type: "up", owner }]);
    }

    await expect
      .poll(() => editor.document)
      .toEqual([
        { ...before[0], props: { ...before[0].props, previewWidth: 573 } },
        before[1],
      ]);
    await expectElement(document.body).toMatchScreenshot("resize-image");
  });
  it("Should be able to delete image with backspace", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [...EMBEDDED_IMAGE],
    });
    editor.setTextCursorPosition(EMBEDDED_IMAGE[0].id);
    editor.focus();
    await waitForSelector(
      `${EDITOR_SELECTOR}:focus .ProseMirror-selectednode img[src="${IMAGE_EMBED_URL}"]`,
    );
    const trailingParagraph = editor.document[1];
    expect(trailingParagraph).toMatchObject({
      type: "paragraph",
      content: [],
      children: [],
    });
    await commands.pressKey("Backspace");
    expect(editor.document).toEqual([trailingParagraph]);
  });
  it("Should show formatting toolbar when image block is selected", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [...EMBEDDED_IMAGE],
    });
    await waitForEmbeddedImage();
    editor.setTextCursorPosition("0");
    editor.focus();
    await waitForSelector(`${EDITOR_SELECTOR}:focus .ProseMirror-selectednode`);

    const toolbar = await waitForSelector(FORMATTING_TOOLBAR);
    await expectElement(toolbar).toBeVisible();
  });
  it("Should open file panel but not formatting toolbar when inserting image with no trailing block", async ({
    setupEditor,
  }) => {
    await setupEditor({ trailingBlock: false });
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
