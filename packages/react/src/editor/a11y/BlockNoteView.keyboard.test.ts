import { readOnlyLinkDocument, editorEscapeDocument } from "./fixtures.js";
import {
  focusPreviousItem,
  escapeEditor,
  moveCursorRight,
  moveCursorDown,
  moveCursorUp,
  focusEditor,
  focusNextItem,
} from "./helpers.js";
import { defaultSchemaDocument } from "@root/tests/a11y/documents.js";
import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { openEditor, readSelection } from "@root/tests/a11y/helpers.js";

// Same navigation as navigateDefaultSchemaDocument, with selection assertions.
async function navigateDefaultSchemaDocumentWithAssertions() {
  await focusEditor();
  await expect.element(page.getByRole("textbox")).toHaveFocus();

  // Follow the document until its endpoint; an unreachable endpoint times out.
  const visitedTableCells = new Set<string>();
  while (readSelection().blockId !== "end") {
    const { tableCell } = readSelection();
    if (tableCell) {
      visitedTableCells.add(`${tableCell.row},${tableCell.column}`);
    }
    // ArrowDown alone skips columns. Move through cell text and across each
    // row with ArrowRight, then resume ArrowDown from the final cell.
    if (tableCell && visitedTableCells.size < 4) {
      await moveCursorRight();
    } else {
      await moveCursorDown();
    }
  }
  expect([...visitedTableCells].sort(), "Every table cell is visited").toEqual([
    "0,0",
    "0,1",
    "1,0",
    "1,1",
  ]);
  expect(readSelection().blockId, "Arrow keys reach the final block").toBe(
    "end",
  );
  while (readSelection().blockId !== "start") {
    await moveCursorUp();
  }
  expect(readSelection().blockId, "ArrowUp returns to the first block").toBe(
    "start",
  );
}

async function focusReadOnlyLinkWithAssertions() {
  const link = page.getByRole("link", { name: "Documentation", exact: true });
  await expect.element(link).toBeVisible();
  while (document.activeElement !== link.element()) {
    await focusNextItem();
  }
  await expect.element(link).toHaveFocus();
  await expect
    .element(link)
    .toMatchScreenshot("read-only-link-focused.png", {});
  return link;
}

test("default schema: arrow-key document navigation", async () => {
  await openEditor(defaultSchemaDocument);
  await navigateDefaultSchemaDocumentWithAssertions();
});

// The editor has no separate focused state without an editing selection; Escape blurs to the body.
test.skip("editor can receive focus without selecting content", async () => {
  // TODO: Focus the editor as a page element without an editing selection.
  // Tab/arrows should navigate the page; Enter should enter editing.
  // Escape currently blurs to body, which does not preserve this entry point.
});

// Whole-block selection requires Cmd+Click; no keyboard interaction is implemented.
test.skip("keyboard selection extends to the entire block", async () => {
  // TODO: Extend a text selection to its whole block, leaving neighbours out.
  // Whole-block selection currently requires Cmd+Click; keyboard UX is TBD.
});

// The keyboard whole-block selection needed to capture its visual indicator is not implemented.
test.skip("whole-block selection is visible", async () => {
  // TODO: Once keyboard block selection exists, snapshot its visual indicator.
  // TODO: Text selection, whole-document selection, and non-inline blocks.
});

test("Escape allows Tab to leave the editor", async () => {
  await openEditor(editorEscapeDocument);
  await focusEditor();
  await expect.element(page.getByRole("textbox")).toHaveFocus();
  await escapeEditor();
  await expect.element(document.body).toHaveFocus();
  await focusNextItem();
  await expect
    .element(page.getByRole("button", { name: "After editor", exact: true }))
    .toHaveFocus();
  // Revisit when the editor can retain focus without an editing selection.
});

// Focused inline links do not yet have a suitable visual focus indicator.
// TODO: Fix the focus appearance and regenerate the visual baseline before enabling.
test.skip("read-only editor: Tab reaches inline links and leaves the editor", async () => {
  await openEditor(readOnlyLinkDocument, { editable: false });
  const link = await focusReadOnlyLinkWithAssertions();
  await focusNextItem();
  await expect
    .element(page.getByRole("button", { name: "After editor", exact: true }))
    .toHaveFocus();
  await focusPreviousItem();
  await expect.element(link).toHaveFocus();
});

// Read-only file/media blocks cannot be selected through the page tab order.
test.skip("read-only editor: Tab selects blocks that expose a formatting toolbar", async () => {
  // TODO: Open a read-only document containing an image/file block between
  // ordinary paragraphs. Tab from Before editor to select that block, assert
  // the block selection and visible indicator, and continue to After editor.
  // Repeat with Shift+Tab. Static paragraphs should not introduce tab stops.
  // Blocks currently cannot be selected through the page's tab order; do not
  // work around this by clicking or setting the selection through editor APIs.
});
