import type { PartialBlock } from "@blocknote/core";
import App from "@examples/01-basic/testing/src/App";
import { describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { commands, page, userEvent } from "../../utils/context.js";
import {
  BACKGROUND_COLOR_SELECTOR,
  COLORS_BUTTON_SELECTOR,
  DRAG_HANDLE_MENU_SELECTOR,
  DRAG_HANDLE_SELECTOR,
  EDITOR_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  TABLE_SELECTOR,
  TEXT_COLOR_SELECTOR,
} from "../../utils/const.js";
import { insertHeading } from "../../utils/copypaste.js";
import {
  focusOnEditor,
  expectElement,
  waitForSelector,
  waitForSelectorDetached,
} from "../../utils/editor.js";
import { moveMouseOverElement } from "../../utils/mouse.js";

async function setupExample() {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
}

function headings(children?: PartialBlock[]): PartialBlock[] {
  return ([1, 2, 3] as const).map((level) => ({
    id: level === 1 ? undefined : `heading-${level}`,
    type: "heading",
    props: { level },
    content: "Heading",
    children: level === 2 ? children : undefined,
  }));
}

const nestedHeadings = headings([{ type: "paragraph", content: "Paragraph" }]);

describe("Check Background & Text Color Functionality", () => {
  test("Should be able to open the color picker from the formatting toolbar", async () => {
    await setupExample();
    await focusOnEditor();

    await insertHeading(1);
    await userEvent.keyboard("{Shift>}{ArrowLeft}{/Shift}");

    await userEvent.click(await waitForSelector(COLORS_BUTTON_SELECTOR));

    await expectElement(
      await waitForSelector(TEXT_COLOR_SELECTOR("red")),
    ).toBeVisible();

    await expectElement(document.body).toMatchScreenshot(
      "colorPickerFormattingToolbar",
    );
  });
  test("Should be able to open the color picker from the side menu", async () => {
    await setupExample();
    await focusOnEditor();

    await insertHeading(1);

    await moveMouseOverElement(H_ONE_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await moveMouseOverElement(page.getByText("Colors").element());

    await expectElement(
      await waitForSelector(TEXT_COLOR_SELECTOR("red")),
    ).toBeVisible();

    await expectElement(document.body).toMatchScreenshot("colorPickerSideMenu");
  });
  it("Should be able to apply a text color mark", async ({
    setupEditor,
    selectText,
  }) => {
    const { editor } = await setupEditor({ initialContent: headings() });
    editor.focus();
    selectText(editor, "Heading", { startBlockId: "heading-2" });

    await userEvent.click(await waitForSelector(COLORS_BUTTON_SELECTOR));
    await userEvent.click(await waitForSelector(TEXT_COLOR_SELECTOR("red")));
    await waitForSelector(
      '.bn-block[data-id="heading-2"] [data-style-type="textColor"][data-value="red"]',
    );

    await commands.pressKey("ArrowLeft");
    await waitForSelectorDetached(COLORS_BUTTON_SELECTOR);

    await expectElement(document.body).toMatchScreenshot("textColorMark");
  });
  it("Should be able to apply a background color mark", async ({
    setupEditor,
    selectText,
  }) => {
    const { editor } = await setupEditor({ initialContent: headings() });
    editor.focus();
    selectText(editor, "Heading", { startBlockId: "heading-2" });

    await userEvent.click(await waitForSelector(COLORS_BUTTON_SELECTOR));
    await userEvent.click(
      await waitForSelector(BACKGROUND_COLOR_SELECTOR("red")),
    );
    await waitForSelector(
      '.bn-block[data-id="heading-2"] [data-style-type="backgroundColor"][data-value="red"]',
    );

    await commands.pressKey("ArrowLeft");
    await waitForSelectorDetached(COLORS_BUTTON_SELECTOR);

    await expectElement(document.body).toMatchScreenshot("backgroundColorMark");
  });
  it("Should be able to set block text color", async ({ setupEditor }) => {
    const { editor } = await setupEditor({ initialContent: nestedHeadings });
    editor.setTextCursorPosition("heading-3", "end");
    editor.focus();

    await moveMouseOverElement(H_TWO_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await moveMouseOverElement(page.getByText("Colors").element());
    await userEvent.click(await waitForSelector(TEXT_COLOR_SELECTOR("red")));
    await waitForSelector(
      '.bn-block[data-id="heading-2"][data-text-color="red"]',
    );
    await waitForSelectorDetached(DRAG_HANDLE_MENU_SELECTOR);

    await expectElement(document.body).toMatchScreenshot("blockTextColor");
  });
  it("Should be able to set block background color", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ initialContent: nestedHeadings });
    editor.setTextCursorPosition("heading-3", "end");
    editor.focus();

    await moveMouseOverElement(H_TWO_BLOCK_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await moveMouseOverElement(page.getByText("Colors").element());
    await userEvent.click(
      await waitForSelector(BACKGROUND_COLOR_SELECTOR("red")),
    );
    await waitForSelector(
      '.bn-block[data-id="heading-2"][data-background-color="red"]',
    );
    await waitForSelectorDetached(DRAG_HANDLE_MENU_SELECTOR);

    await expectElement(document.body).toMatchScreenshot(
      "blockBackgroundColor",
    );
  });
  // Regression test: prosemirror-tables' TableView.update() preserves the
  // NodeView's DOM without re-applying node attrs, so prop changes (e.g.
  // textColor) wouldn't propagate to the blockContent wrapper. BlockNoteTableView
  // overrides update() to sync prop-derived data-* attributes.
  it("Should be able to set block text color on a table", async ({
    setupEditor,
    selectText,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [
        {
          id: "0",
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: ["Table Cell", "", ""] }, { cells: ["", "", ""] }],
          },
        },
      ],
    });
    selectText(editor, "Table Cell").collapseToEnd();
    editor.focus();

    await moveMouseOverElement(TABLE_SELECTOR);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await moveMouseOverElement(page.getByText("Colors").element());
    await userEvent.click(await waitForSelector(TEXT_COLOR_SELECTOR("red")));
    await waitForSelector(`${TABLE_SELECTOR}[data-text-color="red"]`);
    await waitForSelectorDetached(DRAG_HANDLE_MENU_SELECTOR);

    await expectElement(document.body).toMatchScreenshot("blockTextColorTable");
  });
});
