import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { MOD, page, userEvent } from "../../utils/context.js";
import {
  BULLET_LIST_SELECTOR,
  DRAG_HANDLE_ADD_SELECTOR,
  DRAG_HANDLE_MENU_SELECTOR,
  DRAG_HANDLE_SELECTOR,
  EDITOR_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  PARAGRAPH_SELECTOR,
  SLASH_MENU_SELECTOR,
  TEXT_COLOR_SELECTOR,
} from "../../utils/const.js";
import { insertHeading } from "../../utils/copypaste.js";
import {
  getDragHandleYCoord,
  hoverAndAddBlockFromDragHandle,
} from "../../utils/draghandle.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  expectElement,
  sleep,
  waitForSelector,
  waitForSelectorDetached,
} from "../../utils/editor.js";
import { clickAt, getRect, moveMouseOverElement } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

describe("Check Draghandle functionality", () => {
  beforeEach(async () => {
    await render(<App />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
  });

  test("Should show draghandle when hovering over block", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hover over this text");
    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);

    await waitForSelector(DRAG_HANDLE_SELECTOR);
  });

  test("Draghandle should display next to correct block", async () => {
    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);

    const h1y = await getDragHandleYCoord(H_ONE_BLOCK_SELECTOR);
    const h2y = await getDragHandleYCoord(H_TWO_BLOCK_SELECTOR);
    const h3y = await getDragHandleYCoord(H_THREE_BLOCK_SELECTOR);

    expect(h1y < h2y).toBeTruthy();
    expect(h2y < h3y).toBeTruthy();
  });

  test("Draghandle should display next to correct nested block", async () => {
    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertHeading(3);

    const h1y = await getDragHandleYCoord(H_ONE_BLOCK_SELECTOR);
    const h2y = await getDragHandleYCoord(H_TWO_BLOCK_SELECTOR);
    const h3y = await getDragHandleYCoord(H_THREE_BLOCK_SELECTOR);

    expect(h1y < h2y).toBeTruthy();
    expect(h2y < h3y).toBeTruthy();
  });

  test("Clicking draghandle should open menu", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hover over this text");
    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    // Compare editor screenshot

    await sleep(1000);
    await expectElement(document.body).toMatchScreenshot("draghandlemenu");
  });

  test("Clicking add button should create new block", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hover over this text");
    await hoverAndAddBlockFromDragHandle(H_ONE_BLOCK_SELECTOR, "h2");
    await userEvent.keyboard("This is an h2");
    await waitForSelector(H_TWO_BLOCK_SELECTOR);

    await sleep(1000);
    await compareDocToSnapshot("draghandleadd");
  });

  test("Clicking add button should open menu", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hover over this text");
    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));

    await waitForSelector(SLASH_MENU_SELECTOR);
  });

  test("Click add button hides drag handle", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hover over this text");
    await hoverAndAddBlockFromDragHandle(H_ONE_BLOCK_SELECTOR, "h2");
    await waitForSelectorDetached(DRAG_HANDLE_SELECTOR);

    await waitForSelectorDetached(DRAG_HANDLE_ADD_SELECTOR);
  });

  test("Click add button for non-selected empty block", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Heading 1");
    // Wait for animation to finish
    await sleep(350);
    await userEvent.keyboard("{Enter}");
    await hoverAndAddBlockFromDragHandle(PARAGRAPH_SELECTOR, "h1");

    await compareDocToSnapshot("addnonselectedemptyblock");
  });

  test("Clicking delete button should delete block", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hover over this text");

    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await page.getByText("Delete").click();
    await waitForSelectorDetached(H_ONE_BLOCK_SELECTOR);

    await compareDocToSnapshot("draghandledelete");
  });

  test("Delete button should delete correct block", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("This is h1");
    await executeSlashCommand("h2");
    await userEvent.keyboard("This is h2");
    await executeSlashCommand("h3");
    await userEvent.keyboard("This is h3");

    await moveMouseOverElement(H_TWO_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await page.getByText("Delete").click();
    await waitForSelector(H_ONE_BLOCK_SELECTOR);
    await waitForSelectorDetached(H_TWO_BLOCK_SELECTOR);
    await waitForSelector(H_THREE_BLOCK_SELECTOR);

    await compareDocToSnapshot("dragHandleDocStructure");
  });

  test("Delete button should delete all blocks in multi-block selection when hovered block is in selection", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Heading 1");
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("h2");
    await userEvent.keyboard("Heading 2");
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("h3");
    await userEvent.keyboard("Heading 3");
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("bullet");
    await userEvent.keyboard("Bullet List");

    await userEvent.keyboard(
      `{Shift>}{ArrowUp}{${MOD}>}{ArrowLeft}{/${MOD}}{/Shift}`,
    );

    await moveMouseOverElement(H_THREE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await page.getByText("Delete").click();
    await waitForSelector(H_ONE_BLOCK_SELECTOR);
    await waitForSelector(H_TWO_BLOCK_SELECTOR);
    await waitForSelectorDetached(H_THREE_BLOCK_SELECTOR);
    await waitForSelectorDetached(BULLET_LIST_SELECTOR);

    await compareDocToSnapshot("draghandledeletemultiselection");
  });

  test("Delete button should delete only hovered block when it is outside multi-block selection", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("Heading 1");
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("h2");
    await userEvent.keyboard("Heading 2");
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("h3");
    await userEvent.keyboard("Heading 3");
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("bullet");
    await userEvent.keyboard("Bullet List");

    await userEvent.keyboard(
      `{Shift>}{ArrowUp}{${MOD}>}{ArrowLeft}{/${MOD}}{/Shift}`,
    );

    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await page.getByText("Delete").click();
    await waitForSelectorDetached(H_ONE_BLOCK_SELECTOR);
    await waitForSelector(H_TWO_BLOCK_SELECTOR);
    await waitForSelector(H_THREE_BLOCK_SELECTOR);
    await waitForSelector(BULLET_LIST_SELECTOR);

    await compareDocToSnapshot("draghandledeletehoveroutsideselection");
  });

  test("Deleting block with children should delete all children", async () => {
    await executeSlashCommand("h1");
    await userEvent.keyboard("This is h1");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await executeSlashCommand("h2");
    await userEvent.keyboard("This is h2");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await executeSlashCommand("h3");
    await userEvent.keyboard("This is h3");

    await moveMouseOverElement(H_TWO_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await page.getByText("Delete").click();
    await waitForSelector(H_ONE_BLOCK_SELECTOR);
    await waitForSelectorDetached(H_TWO_BLOCK_SELECTOR);
    await waitForSelectorDetached(H_THREE_BLOCK_SELECTOR);

    await compareDocToSnapshot("draghandlenesteddelete");
  });

  // #3186: the selection survives a blur, so focus coming back into the
  // editor's UI (the drag handle) must not show the toolbar over the menu.
  test("Clicking the drag handle while the editor is blurred keeps the formatting toolbar hidden", async () => {
    await userEvent.keyboard("First paragraph");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("Second paragraph");

    // Select a word: the formatting toolbar shows.
    const word = getRect(page.getByText("First paragraph").element());
    await clickAt(word.x + 10, word.y + word.height / 2, 2);
    await waitForSelector(".bn-formatting-toolbar");

    // Focus something outside the editor: the toolbar hides.
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.append(outside);
    try {
      await userEvent.click(outside);
      await waitForSelectorDetached(".bn-formatting-toolbar");

      const second = page.getByText("Second paragraph").element();
      await moveMouseOverElement(second);
      await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
      await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
      await sleep(100);
      expect(document.querySelector(".bn-formatting-toolbar")).toBeNull();
    } finally {
      outside.remove();
    }
  });
});

describe("Focus after the drag handle menu", () => {
  // Closing the menu gives the focus back to the editor, so the keyboard
  // works on it right away, e.g. to undo the change (#3165). Nothing is typed
  // first: the browser would otherwise undo through its own undo stack, even
  // without focus.
  test("undoes a block color set in the drag handle menu with the keyboard", async () => {
    function Editor() {
      const editor = useCreateBlockNote({
        initialContent: [{ type: "paragraph", content: "Paragraph" }],
      });
      return <BlockNoteView editor={editor} />;
    }
    await render(<Editor />);
    // The block is drawn again when its color changes.
    const textColor = () =>
      document
        .querySelector(PARAGRAPH_SELECTOR)!
        .closest(".bn-block")!
        .getAttribute("data-text-color");

    await moveMouseOverElement(await waitForSelector(PARAGRAPH_SELECTOR));
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await moveMouseOverElement(page.getByText("Colors").element());
    // WebKit needs the submenu's open animation to settle before its
    // children have non-zero bounding boxes.
    await waitForSelector(TEXT_COLOR_SELECTOR("red"));
    await sleep(200);
    const { x, y } = getRect(TEXT_COLOR_SELECTOR("red"));
    await clickAt(x + 10, y + 10);
    await waitForSelectorDetached(DRAG_HANDLE_MENU_SELECTOR);
    expect(textColor()).toBe("red");

    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`);
    expect(textColor()).toBeNull();
  });
});
