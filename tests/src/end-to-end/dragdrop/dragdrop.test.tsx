import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { createRef } from "react";
import TestingApp from "@examples/01-basic/testing/src/App";
import PdfFileApp from "@examples/06-custom-schema/04-pdf-file-block/src/App";
import { describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import {
  EDITOR_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  IMAGE_SELECTOR,
  PARAGRAPH_SELECTOR,
  PDF_SELECTOR,
} from "../../utils/const.js";
import { browserName, userEvent } from "../../utils/context.js";
import { insertHeading, insertParagraph } from "../../utils/copypaste.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  waitForSelector,
} from "../../utils/editor.js";
import { dragAndDropBlock } from "../../utils/mouse.js";
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
      await render(<TestingApp />);
      await waitForSelector(EDITOR_SELECTOR);
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
      await render(<TestingApp />);
      await waitForSelector(EDITOR_SELECTOR);
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
      await render(<TestingApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();
      await executeSlashCommand("image");
      await userEvent.keyboard("{Escape}");
      const paragraphs = document.querySelectorAll(PARAGRAPH_SELECTOR);
      await userEvent.click(paragraphs[paragraphs.length - 1]);
      await insertHeading(1);

      await dragAndDropBlock(IMAGE_SELECTOR, H_ONE_BLOCK_SELECTOR, false);

      await compareDocToSnapshot("dragImage");
    },
  );

  test.skipIf(browserName === "firefox")(
    "Formatting toolbar should not appear when dragging image block",
    async () => {
      await render(<TestingApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();
      await executeSlashCommand("image");
      await userEvent.keyboard("{Escape}");
      const paragraphs = document.querySelectorAll(PARAGRAPH_SELECTOR);
      await userEvent.click(paragraphs[paragraphs.length - 1]);
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
      await render(<PdfFileApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();
      await waitForSelector(PDF_SELECTOR);

      const firstParagraph = document.querySelector(
        PARAGRAPH_SELECTOR,
      ) as HTMLElement;
      await dragAndDropBlock(PDF_SELECTOR, firstParagraph, false);

      await compareDocToSnapshot("dragPdf");
    },
  );

  test.skipIf(browserName === "firefox")(
    "keeps the dropped block visible when the previous selection is offscreen",
    async () => {
      const editor = BlockNoteEditor.create({
        initialContent: Array.from({ length: 70 }, (_, index) => ({
          id: `paragraph-${index}`,
          type: "paragraph",
          content: `Paragraph ${index}`,
        })),
      });
      const scrollRef = createRef<HTMLDivElement>();
      await render(
        <div
          ref={scrollRef}
          style={{ height: 300, width: 600, overflowY: "auto" }}
        >
          <BlockNoteView editor={editor} />
        </div>,
      );
      const scroller = scrollRef.current!;
      const selectedBlock = await waitForSelector('[data-id="paragraph-0"]');
      const source = await waitForSelector('[data-id="paragraph-60"]');
      const destination = await waitForSelector('[data-id="paragraph-62"]');
      editor.setTextCursorPosition("paragraph-0", "start");
      editor.focus();

      // Keep the native selection near the start while scrolling to later blocks.
      // Refocusing on drop must not scroll back to that old selection.
      scroller.scrollTop +=
        source.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top -
        80;
      expect(selectedBlock.getBoundingClientRect().bottom).toBeLessThan(
        scroller.getBoundingClientRect().top,
      );
      expect(editor.getTextCursorPosition().block.id).toBe("paragraph-0");

      await dragAndDropBlock(source, destination, false);

      await expect
        .poll(() => {
          const ids = editor.document.map((block) => block.id);
          return ids[ids.indexOf("paragraph-62") + 1];
        })
        .toBe("paragraph-60");
      await expect
        .poll(() => {
          const moved = scroller.querySelector('[data-id="paragraph-60"]');
          if (!moved) {
            return false;
          }
          const blockRect = moved.getBoundingClientRect();
          const viewport = scroller.getBoundingClientRect();
          return (
            blockRect.top >= viewport.top && blockRect.bottom <= viewport.bottom
          );
        })
        .toBe(true);
    },
  );
});
