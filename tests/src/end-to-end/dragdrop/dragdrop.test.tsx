import PdfFileApp from "@examples/06-custom-schema/04-pdf-file-block/src/App";
import TestingApp from "@examples/01-basic/testing/src/App";
import { describe, expect, test } from "vite-plus/test";
import { browserName, userEvent } from "../../utils/context.js";
import {
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  IMAGE_SELECTOR,
  PARAGRAPH_SELECTOR,
  PDF_SELECTOR,
} from "../../utils/const.js";
import { insertHeading, insertParagraph } from "../../utils/copypaste.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  waitForSelector,
} from "../../utils/editor.js";
import { dragAndDropBlock } from "../../utils/mouse.js";
import { renderEditor } from "../../utils/render.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

// `expect.element` is augmented against the bare `vitest` module, but vite-plus
// types `expect` from an internal module, so the augmentation doesn't attach.
// Type the accessor locally.
type ElementMatchers = {
  not: { toBeVisible(): Promise<void> };
};
type ElementExpect = (element: Element | null) => ElementMatchers;
const expectElement = (expect as unknown as { element: ElementExpect }).element;

describe("Check Block Dragging Functionality", () => {
  // Playwright doesn't correctly simulate drag events in Firefox.
  test.skipIf(browserName === "firefox")(
    "Should be able to drag & drop non-nested blocks",
    async () => {
      await renderEditor(<TestingApp />);
      await focusOnEditor();

      await insertHeading(1);
      await userEvent.keyboard("{Enter}");
      await insertHeading(2);
      await userEvent.keyboard("{Enter}");
      await insertHeading(3);

      await dragAndDropBlock(H_ONE_BLOCK_SELECTOR, H_TWO_BLOCK_SELECTOR, false);

      await compareDocToSnapshot("dragdropsingle");
    },
  );

  test.skipIf(browserName === "firefox")(
    "Should be able to drag & drop nested blocks",
    async () => {
      await renderEditor(<TestingApp />);
      await focusOnEditor();

      await insertHeading(1);
      await userEvent.keyboard("{Enter}");
      await insertParagraph();
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Tab}");
      await insertHeading(2);
      await userEvent.keyboard("{Enter}");
      await insertParagraph();
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Tab}");
      await insertHeading(3);
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
      await userEvent.keyboard("{Shift>}{Tab}{/Shift}");

      // Dragging first heading into next nested element.
      await dragAndDropBlock(H_ONE_BLOCK_SELECTOR, H_TWO_BLOCK_SELECTOR, true);

      // Dragging second heading into next nested element.
      await dragAndDropBlock(
        H_TWO_BLOCK_SELECTOR,
        H_THREE_BLOCK_SELECTOR,
        true,
      );

      const lastParagraph = document.querySelectorAll(PARAGRAPH_SELECTOR);
      await dragAndDropBlock(
        H_THREE_BLOCK_SELECTOR,
        lastParagraph[lastParagraph.length - 1] as HTMLElement,
        true,
      );

      await compareDocToSnapshot("dragdropnested");
    },
  );

  test.skipIf(browserName === "firefox")(
    "Should be able to drag image",
    async () => {
      await renderEditor(<TestingApp />);
      await focusOnEditor();
      await executeSlashCommand("image");
      await userEvent.keyboard("{Escape}");
      await userEvent.click(await waitForSelector(".bn-trailing-block"));
      await insertHeading(1);

      await dragAndDropBlock(IMAGE_SELECTOR, H_ONE_BLOCK_SELECTOR, false);

      await compareDocToSnapshot("dragImage");
    },
  );

  test.skipIf(browserName === "firefox")(
    "Formatting toolbar should not appear when dragging image block",
    async () => {
      await renderEditor(<TestingApp />);
      await focusOnEditor();
      await executeSlashCommand("image");
      await userEvent.keyboard("{Escape}");
      await userEvent.click(await waitForSelector(".bn-trailing-block"));
      await insertHeading(1);

      await dragAndDropBlock(IMAGE_SELECTOR, H_ONE_BLOCK_SELECTOR, false);

      await expectElement(
        document.querySelector(".bn-formatting-toolbar"),
      ).not.toBeVisible();
    },
  );

  test.skipIf(browserName === "firefox")(
    "Should be able to drag PDF block",
    async () => {
      await renderEditor(<PdfFileApp />);
      await focusOnEditor();
      await waitForSelector(PDF_SELECTOR);

      const firstParagraph = document.querySelector(
        PARAGRAPH_SELECTOR,
      ) as HTMLElement;
      await dragAndDropBlock(PDF_SELECTOR, firstParagraph, false);

      await compareDocToSnapshot("dragPdf");
    },
  );
});
