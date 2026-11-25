import type { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { describe, expect } from "vite-plus/test";
import { MOD, page, userEvent } from "../../utils/context.js";
import {
  BULLET_LIST_SELECTOR,
  DRAG_HANDLE_ADD_SELECTOR,
  DRAG_HANDLE_MENU_SELECTOR,
  DRAG_HANDLE_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  PARAGRAPH_SELECTOR,
  SLASH_MENU_SELECTOR,
  TEXT_COLOR_SELECTOR,
} from "../../utils/const.js";
import {
  getDragHandleYCoord,
  hoverAndAddBlockFromDragHandle,
} from "../../utils/draghandle.js";
import {
  expectElement,
  waitForSelector,
  waitForSelectorDetached,
} from "../../utils/editor.js";
import { moveMouseOverElement } from "../../utils/mouse.js";

function heading(
  level: 1 | 2 | 3,
  content = `Heading ${level}`,
  children?: PartialBlock[],
): PartialBlock {
  return { type: "heading", props: { level }, content, children };
}

const hoverHeading = heading(1, "Hover over this text");

describe("Check Draghandle functionality", () => {
  it("Should show draghandle when hovering over block", async ({
    setupEditor,
  }) => {
    await setupEditor({ initialContent: [hoverHeading] });
    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);

    await waitForSelector(DRAG_HANDLE_SELECTOR);
  });

  it("Draghandle should display next to correct block", async ({
    setupEditor,
  }) => {
    await setupEditor({ initialContent: [heading(1), heading(2), heading(3)] });

    const h1y = await getDragHandleYCoord(H_ONE_BLOCK_SELECTOR);
    const h2y = await getDragHandleYCoord(H_TWO_BLOCK_SELECTOR);
    const h3y = await getDragHandleYCoord(H_THREE_BLOCK_SELECTOR);

    expect(h1y < h2y).toBeTruthy();
    expect(h2y < h3y).toBeTruthy();
  });

  it("Draghandle should display next to correct nested block", async ({
    setupEditor,
  }) => {
    await setupEditor({
      initialContent: [
        heading(1, undefined, [heading(2, undefined, [heading(3)])]),
      ],
    });

    const h1y = await getDragHandleYCoord(H_ONE_BLOCK_SELECTOR);
    const h2y = await getDragHandleYCoord(H_TWO_BLOCK_SELECTOR);
    const h3y = await getDragHandleYCoord(H_THREE_BLOCK_SELECTOR);

    expect(h1y < h2y).toBeTruthy();
    expect(h2y < h3y).toBeTruthy();
  });

  it("Clicking draghandle should open menu", async ({ setupEditor }) => {
    const { editor } = await setupEditor({ initialContent: [hoverHeading] });
    editor.setTextCursorPosition(editor.document[0], "end");
    editor.focus();
    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    const menu = await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await expectElement(menu).toBeVisible();
    await expect.poll(() => getComputedStyle(menu).opacity).toBe("1");
    await expectElement(document.body).toMatchScreenshot("draghandlemenu");
  });

  it("Clicking add button should create new block", async ({ setupEditor }) => {
    const { editor } = await setupEditor({ initialContent: [hoverHeading] });
    const [original] = editor.document;
    await hoverAndAddBlockFromDragHandle(H_ONE_BLOCK_SELECTOR, 2);
    await waitForSelector(H_TWO_BLOCK_SELECTOR);
    await waitForSelectorDetached(DRAG_HANDLE_SELECTOR);
    await waitForSelectorDetached(DRAG_HANDLE_ADD_SELECTOR);
    await userEvent.keyboard("This is an h2");

    expect(editor.document).toMatchObject([
      original,
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "This is an h2", styles: {} }],
        children: [],
      },
    ]);
    expect(editor.document[1].id).not.toBe(original.id);
  });

  it("Clicking add button should open menu", async ({ setupEditor }) => {
    await setupEditor({ initialContent: [hoverHeading] });
    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));

    await waitForSelector(SLASH_MENU_SELECTOR);
  });

  it("Typing in the add-block menu hides the drag handle", async ({
    setupEditor,
  }) => {
    await setupEditor({ initialContent: [hoverHeading] });
    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));
    await waitForSelector(SLASH_MENU_SELECTOR);
    await expectElement(
      await waitForSelector(DRAG_HANDLE_SELECTOR),
    ).toBeVisible();

    // Keydown should hide the side menu before the command is submitted.
    await userEvent.keyboard("h2");
    await waitForSelectorDetached(DRAG_HANDLE_SELECTOR);
    await waitForSelectorDetached(DRAG_HANDLE_ADD_SELECTOR);
    await expectElement(
      await waitForSelector(SLASH_MENU_SELECTOR),
    ).toBeVisible();
  });

  it("Click add button for non-selected empty block", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [heading(1), { type: "paragraph" }],
    });
    const [original, empty] = editor.document;
    editor.focus();
    expect(editor.getTextCursorPosition().block.id).toBe(editor.document[0].id);
    await hoverAndAddBlockFromDragHandle(PARAGRAPH_SELECTOR, 1);

    expect(editor.document).toMatchObject([
      original,
      {
        id: empty.id,
        type: "heading",
        props: { level: 1 },
        content: [],
        children: [],
      },
    ]);
  });

  it("Clicking delete button should delete block", async ({ setupEditor }) => {
    const { editor } = await setupEditor({ initialContent: [hoverHeading] });
    const [deleted] = editor.document;

    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await page.getByText("Delete").click();
    await waitForSelectorDetached(H_ONE_BLOCK_SELECTOR);

    expect(editor.document).toMatchObject([
      { type: "paragraph", content: [], children: [] },
    ]);
    expect(editor.getBlock(deleted.id)).toBeUndefined();
  });

  it("Delete button should delete correct block", async ({ setupEditor }) => {
    const { editor } = await setupEditor({
      initialContent: [
        heading(1, "This is h1"),
        heading(2, "This is h2"),
        heading(3, "This is h3"),
      ],
    });
    const [h1, , h3] = editor.document;

    await moveMouseOverElement(H_TWO_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await page.getByText("Delete").click();
    await waitForSelector(H_ONE_BLOCK_SELECTOR);
    await waitForSelectorDetached(H_TWO_BLOCK_SELECTOR);
    await waitForSelector(H_THREE_BLOCK_SELECTOR);

    expect(editor.document).toEqual([h1, h3]);
  });

  const multiSelectionDocument: PartialBlock[] = [
    heading(1),
    heading(2),
    heading(3),
    { type: "bulletListItem", content: "Bullet List" },
  ];

  it("Delete button should delete all blocks in multi-block selection when hovered block is in selection", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: multiSelectionDocument,
    });
    const before = editor.document;
    editor.focus();
    editor.setSelection(editor.document[2], editor.document[3]);

    await moveMouseOverElement(H_THREE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await page.getByText("Delete").click();
    await waitForSelector(H_ONE_BLOCK_SELECTOR);
    await waitForSelector(H_TWO_BLOCK_SELECTOR);
    await waitForSelectorDetached(H_THREE_BLOCK_SELECTOR);
    await waitForSelectorDetached(BULLET_LIST_SELECTOR);

    expect(editor.document).toEqual(before.slice(0, 2));
  });

  it("Delete button should delete only hovered block when it is outside multi-block selection", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: multiSelectionDocument,
    });
    const before = editor.document;
    editor.focus();
    editor.setSelection(editor.document[2], editor.document[3]);

    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await page.getByText("Delete").click();
    await waitForSelectorDetached(H_ONE_BLOCK_SELECTOR);
    await waitForSelector(H_TWO_BLOCK_SELECTOR);
    await waitForSelector(H_THREE_BLOCK_SELECTOR);
    await waitForSelector(BULLET_LIST_SELECTOR);

    expect(editor.document).toEqual(before.slice(1));
  });

  it("Deleting block with children should delete all children", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [
        heading(1, "This is h1", [
          heading(2, "This is h2", [heading(3, "This is h3")]),
        ]),
      ],
    });
    const [parent] = editor.document;

    await moveMouseOverElement(H_TWO_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await page.getByText("Delete").click();
    await waitForSelector(H_ONE_BLOCK_SELECTOR);
    await waitForSelectorDetached(H_TWO_BLOCK_SELECTOR);
    await waitForSelectorDetached(H_THREE_BLOCK_SELECTOR);

    expect(editor.document).toEqual([{ ...parent, children: [] }]);
  });

  // #3186: the selection survives a blur, so focus coming back into the
  // editor's UI (the drag handle) must not show the toolbar over the menu.
  it("Clicking the drag handle while the editor is blurred keeps the formatting toolbar hidden", async ({
    setupEditor,
    selectText,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [
        { type: "paragraph", content: "First paragraph" },
        { type: "paragraph", content: "Second paragraph" },
      ],
    });

    // Seed the selection directly: the interaction under test starts at blur.
    editor.focus();
    await window.__blockNoteWaitForEditorFocus();
    selectText(editor, "First");
    await expect.poll(() => document.getSelection()?.toString()).toBe("First");
    await expectElement(
      await waitForSelector(".bn-formatting-toolbar"),
    ).toBeVisible();

    // Focus something outside the editor: the toolbar hides.
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.append(outside);
    try {
      await userEvent.click(outside);
      await waitForSelectorDetached(".bn-formatting-toolbar");
      expect(editor.isFocused()).toBe(false);
      expect(editor.getSelectedText()).toBe("First");

      const second = page.getByText("Second paragraph").element();
      await moveMouseOverElement(second);
      await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
      await expectElement(
        await waitForSelector(DRAG_HANDLE_MENU_SELECTOR),
      ).toBeVisible();
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
  it("undoes a block color set in the drag handle menu with the keyboard", async ({
    setupEditor,
  }) => {
    await setupEditor({
      initialContent: [{ type: "paragraph", content: "Paragraph" }],
    });
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
    // Locator actionability waits for the submenu control to be hit-testable.
    await userEvent.click(await waitForSelector(TEXT_COLOR_SELECTOR("red")));
    await waitForSelectorDetached(DRAG_HANDLE_MENU_SELECTOR);
    expect(textColor()).toBe("red");

    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`);
    expect(textColor()).toBeNull();
  });
});
