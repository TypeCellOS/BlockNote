/* eslint-disable jest/valid-title */
import TestingApp from "@examples/01-basic/testing/src/App";
import NonEditableApp from "@examples/06-custom-schema/08-non-editable-block/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { browserName, MOD, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import {
  copyPaste,
  copyPasteAll,
  insertHeading,
  insertListItems,
  insertNestedListItems,
  insertParagraph,
  startList,
} from "../../utils/copypaste.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  waitForSelector,
} from "../../utils/editor.js";
import { getRect, mouseSequence } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

describe("Check Copy/Paste Functionality", () => {
  beforeEach(async () => {
    render(<TestingApp />);
    await waitForSelector(EDITOR_SELECTOR);
  });

  // Firefox doesn't yet support the async clipboard API. Webkit copy/paste
  // stopped working after updating to Playwright 1.33.
  test.skipIf(browserName === "firefox" || browserName === "webkit")(
    "Paragraphs should stay separate",
    async () => {
      await focusOnEditor();
      await insertParagraph();
      await userEvent.keyboard("{Enter}");
      await insertParagraph();
      await userEvent.keyboard("{Enter}");
      await insertParagraph();
      await copyPasteAll();

      await compareDocToSnapshot("paragraphs");
    },
  );

  test.skipIf(browserName === "firefox" || browserName === "webkit")(
    "Headings should keep formatting",
    async () => {
      await focusOnEditor();
      await insertHeading(1);
      await userEvent.keyboard("{Enter}");
      await insertHeading(2);
      await userEvent.keyboard("{Enter}");
      await insertHeading(3);
      await copyPasteAll();

      await compareDocToSnapshot("headings");
    },
  );

  test.skipIf(browserName === "firefox" || browserName === "webkit")(
    "Unordered lists should keep formatting",
    async () => {
      await focusOnEditor();
      await startList(false);
      await insertListItems();
      await copyPasteAll();

      await compareDocToSnapshot("unorderedLists");
    },
  );

  test.skipIf(browserName === "firefox" || browserName === "webkit")(
    "Ordered lists should keep formatting",
    async () => {
      await focusOnEditor();
      await startList(true);
      await insertListItems();
      await copyPasteAll();

      await compareDocToSnapshot("orderedLists");
    },
  );

  test.skipIf(browserName === "firefox" || browserName === "webkit")(
    "Nested paragraphs should stay nested",
    async () => {
      await focusOnEditor();
      await insertParagraph();
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Tab}");
      await insertParagraph();
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Tab}");
      await insertParagraph();
      await copyPasteAll();

      await compareDocToSnapshot("nestedParagraphs");
    },
  );

  test.skipIf(browserName === "firefox" || browserName === "webkit")(
    "Nested unordered lists should stay nested",
    async () => {
      await focusOnEditor();
      await startList(false);
      await insertNestedListItems();
      await copyPasteAll();

      await compareDocToSnapshot("nestedUnorderedLists");
    },
  );

  test.skipIf(browserName === "firefox" || browserName === "webkit")(
    "Nested ordered lists should stay nested",
    async () => {
      await focusOnEditor();
      await startList(true);
      await insertNestedListItems();
      await copyPasteAll();

      await compareDocToSnapshot("nestedOrderedLists");
    },
  );

  test.skipIf(browserName === "firefox" || browserName === "webkit")(
    "Images should keep props",
    async () => {
      await focusOnEditor();
      await userEvent.keyboard("paragraph");

      const IMAGE_EMBED_URL = "https://placehold.co/800x540.png";
      await executeSlashCommand("image");

      await userEvent.click(await waitForSelector(`[data-test="embed-tab"]`));
      await userEvent.click(await waitForSelector(`[data-test="embed-input"]`));
      await userEvent.keyboard(IMAGE_EMBED_URL);
      await userEvent.click(
        await waitForSelector(`[data-test="embed-input-button"]`),
      );
      await waitForSelector(`img[src="${IMAGE_EMBED_URL}"]`);

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

      await copyPaste();

      await compareDocToSnapshot("images");
    },
  );
});

describe("Check Copy/Paste From Non-Editable Block", () => {
  beforeEach(async () => {
    render(<NonEditableApp />);
    await waitForSelector(EDITOR_SELECTOR);
  });

  // Firefox doesn't yet support the async clipboard API. Webkit copy/paste
  // stopped working after updating to Playwright 1.33.
  test.skipIf(browserName === "firefox" || browserName === "webkit")(
    "Should be able to copy/paste text from a non-editable block",
    async () => {
      // Click and drag across the non-editable block's text to select part of it.
      const box = getRect('[data-content-type="nonEditable"] p');
      await mouseSequence([
        { type: "move", x: box.x + 2, y: box.y + box.height / 2 },
        { type: "down" },
        {
          type: "move",
          x: box.x + box.width * 0.25,
          y: box.y + box.height / 2,
          steps: 5,
        },
        { type: "up" },
      ]);

      await userEvent.keyboard(`{${MOD}>}c{/${MOD}}`);

      // Click the trailing block to create a new empty paragraph and focus
      // the editor there.
      await userEvent.click(await waitForSelector(".bn-trailing-block"));

      await userEvent.keyboard(`{${MOD}>}v{/${MOD}}`);

      await compareDocToSnapshot("nonEditableBlock");
    },
  );
});
