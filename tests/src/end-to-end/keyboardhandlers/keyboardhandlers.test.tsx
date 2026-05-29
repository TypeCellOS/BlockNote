import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { MOD, userEvent } from "../../utils/context.js";
import {
  H_ONE_BLOCK_SELECTOR,
  ITALIC_BUTTON_SELECTOR,
} from "../../utils/const.js";
import { insertHeading, insertParagraph } from "../../utils/copypaste.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import { clickAt, getRect } from "../../utils/mouse.js";
import { renderEditor } from "../../utils/render.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

beforeEach(async () => {
  await renderEditor(<App />);
});

describe("Check Keyboard Handlers' Behaviour", () => {
  test("Check Enter when selection is not empty", async () => {
    await focusOnEditor();
    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await insertHeading(2);

    await sleep(500);

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard(`{${MOD}>}{ArrowLeft}{/${MOD}}`);
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard(
      `{Shift>}{ArrowDown}{${MOD}>}{ArrowRight}{/${MOD}}{ArrowLeft}{/Shift}`,
    );

    await userEvent.keyboard("{Enter}");

    await compareDocToSnapshot("enterSelectionNotEmpty");
  });
  test("Check Enter preserves marks", async () => {
    await focusOnEditor();
    await insertHeading(1);

    await sleep(500);
    const { x, y, height } = getRect(H_ONE_BLOCK_SELECTOR);

    await clickAt(x + 35, y + height / 2, 2);
    await userEvent.click(await waitForSelector(ITALIC_BUTTON_SELECTOR));
    await userEvent.keyboard("{Escape}");
    await sleep(500);
    await userEvent.keyboard("{Control>}{ArrowLeft}{/Control}");
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{Enter}");

    await compareDocToSnapshot("enterPreservesMarks");
  });
  test("Check Enter preserves nested blocks", async () => {
    await focusOnEditor();
    await insertHeading(1);
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);

    await sleep(500);
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Control>}{ArrowLeft}{/Control}");
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{Enter}");

    await compareDocToSnapshot("enterPreservesNestedBlocks");
  });
  test("Check Enter preserves nested blocks for empty block", async () => {
    await focusOnEditor();
    await userEvent.keyboard("#");
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertHeading(2);
    await userEvent.keyboard("{Enter}");
    await insertHeading(3);

    await sleep(500);
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Enter}");

    await compareDocToSnapshot("enterPreservesNestedBlocksEmpty");
  });
  test("Check Backspace at the start of a block", async () => {
    await focusOnEditor();
    await insertHeading(1);

    await userEvent.keyboard("{Control>}{ArrowLeft}{/Control}");
    await userEvent.keyboard("{Backspace}");

    await compareDocToSnapshot("backspaceStartOfBlock");
  });
  test("Check Backspace preserves marks", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await insertParagraph();

    await userEvent.keyboard("{Control>}{ArrowLeft}{/Control}");

    for (let i = 0; i < 2; i++) {
      await userEvent.keyboard("{ArrowRight}");
    }

    for (let i = 0; i < 5; i++) {
      await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
    }

    await userEvent.click(await waitForSelector(ITALIC_BUTTON_SELECTOR));
    await userEvent.keyboard("{Escape}");
    await sleep(500);

    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{Control>}{ArrowLeft}{/Control}");
    await userEvent.keyboard("{Backspace}");

    await compareDocToSnapshot("backspacePreservesMarks");
  });
  test("Check Backspace preserves nested blocks", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertParagraph();

    for (let i = 0; i < 2; i++) {
      await userEvent.keyboard("{ArrowUp}");
    }

    await userEvent.keyboard("{Control>}{ArrowLeft}{/Control}");
    await userEvent.keyboard("{Backspace}");

    await compareDocToSnapshot("backspacePreservesNestedBlocks");
  });
  test("Check Backspace preserves nested blocks for empty block", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertParagraph();

    for (let i = 0; i < 2; i++) {
      await userEvent.keyboard("{ArrowUp}");
    }

    await userEvent.keyboard("{Backspace}");

    await compareDocToSnapshot("backspacePreservesNestedBlocksEmpty");
  });
  test("Check Delete at the end of a block", async () => {
    await focusOnEditor();
    await insertParagraph();

    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteEndOfBlock");
  });
  test("Check Delete while selection not empty", async () => {
    await focusOnEditor();
    await insertParagraph();

    // Hold Shift across BOTH ArrowLefts in a single keyboard call so the
    // selection actually extends to 2 characters. Splitting into two calls
    // releases Shift between them, leaving a 1-char selection and producing
    // the wrong doc.
    await userEvent.keyboard("{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}");
    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteSelection");
  });
  test("Check Delete before inline content block", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await insertParagraph();

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteInlineContent");
  });
  test("Check Delete before image block", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("image");
    await userEvent.keyboard("{Escape}"); // Close file panel

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteImage");
  });
  test("Check Delete before table", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await executeSlashCommand("table");

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteTable");
  });
  test("Check Delete selected image block", async () => {
    await focusOnEditor();
    await executeSlashCommand("image");
    await userEvent.keyboard("{Escape}"); // Close file panel

    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteSelectedImage");
  });
  test("Check Delete end of block with inline content child", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertParagraph();

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteInlineContentChild");
  });
  test("Check Delete end of block with image child", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await executeSlashCommand("image");
    await userEvent.keyboard("{Escape}"); // Close file panel

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteImageChild");
  });
  test("Check Delete end of block with table child", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await executeSlashCommand("table");

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteTableChild");
  });
  test("Check Delete end of block with multiple children", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await insertParagraph();

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteMultipleChildren");
  });
  test("Check Delete end of block with nested children", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertParagraph();

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteNestedChildren");
  });
  test("Check Delete before shallower block", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    await insertParagraph();

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteShallowerBlock");
  });
  test("Check Delete before shallower block with children", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await insertParagraph();

    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard(`{${MOD}>}{ArrowLeft}{/${MOD}}`);
    await userEvent.keyboard(`{${MOD}>}{ArrowRight}{/${MOD}}`);
    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteShallowerBlockWithChildren");
  });
  test("Check heading 1 shortcut", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{Alt>}1{/Alt}{/${MOD}}`);

    await compareDocToSnapshot("heading1Shortcut");
  });
  test("Check heading 2 shortcut", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{Alt>}2{/Alt}{/${MOD}}`);

    await compareDocToSnapshot("heading2Shortcut");
  });
  test("Check heading 3 shortcut", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{Alt>}3{/Alt}{/${MOD}}`);

    await compareDocToSnapshot("heading3Shortcut");
  });
  test("Check numbered list item shortcut", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{Shift>}7{/Shift}{/${MOD}}`);

    await compareDocToSnapshot("numberedListItemShortcut");
  });
  test("Check bullet list item shortcut", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{Shift>}8{/Shift}{/${MOD}}`);

    await compareDocToSnapshot("bulletListItemShortcut");
  });
  test("Check checked list item shortcut", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{Shift>}9{/Shift}{/${MOD}}`);

    await compareDocToSnapshot("checkedListItemShortcut");
  });
  test("Check arrow up on checklist item moves to element above", async () => {
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(`{${MOD}>}{Shift>}9{/Shift}{/${MOD}}`);
    await userEvent.keyboard("Checklist item");

    await sleep(150);
    // Move cursor to the start of the checklist item
    await userEvent.keyboard("{Control>}{ArrowLeft}{/Control}");
    // Press arrow up - should move to the paragraph above
    await userEvent.keyboard("{ArrowUp}");
    // Type to verify cursor is in the paragraph above
    await userEvent.keyboard("Above");

    await compareDocToSnapshot("arrowUpChecklistItem");
  });

  test("Check checkListItem inputRule preserves content", async () => {
    await focusOnEditor();
    // Type [ ] followed by space at the start to trigger inputRule, then add content
    // The inputRule should convert the paragraph to a checkListItem and preserve the content we type after
    await userEvent.keyboard("[[ ] My task");
    await sleep(500);

    await compareDocToSnapshot("checkListItemInputRulePreservesContent");
  });
  test("Check checkListItem inputRule with checked preserves content", async () => {
    await focusOnEditor();
    // Type [x] followed by space at the start to trigger inputRule with checked=true, then add content
    // This should convert the paragraph to a checkListItem with checked=true and preserve the content
    await userEvent.keyboard("[[x] Completed task");
    await sleep(150);

    await compareDocToSnapshot("checkListItemInputRuleCheckedPreservesContent");
  });
  test("Check bulletListItem inputRule preserves content", async () => {
    await focusOnEditor();
    // Type - followed by space at the start to trigger inputRule, then add content
    // The inputRule should convert the paragraph to a bulletListItem and preserve the content
    await userEvent.keyboard("- My task");
    await sleep(500);

    await compareDocToSnapshot("bulletListItemInputRulePreservesContent");
  });
  test("Check numberedListItem inputRule preserves content", async () => {
    await focusOnEditor();
    // Type 1. followed by space at the start to trigger inputRule, then add content
    // The inputRule should convert the paragraph to a numberedListItem and preserve the content
    await userEvent.keyboard("1. My task");
    await sleep(500);

    await compareDocToSnapshot("numberedListItemInputRulePreservesContent");
  });
});
