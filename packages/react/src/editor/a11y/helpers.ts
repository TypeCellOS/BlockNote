import { page } from "vite-plus/test/browser";
import { pressKey, readSelection } from "@root/tests/a11y/helpers.js";

export async function focusEditor() {
  await pressKey("Tab");
}

export async function focusNextItem() {
  await pressKey("Tab");
}

export async function focusPreviousItem() {
  await pressKey("Shift+Tab");
}

export async function escapeEditor() {
  await pressKey("Escape");
}

export async function moveCursorRight() {
  await pressKey("ArrowRight");
}

export async function moveCursorDown() {
  await pressKey("ArrowDown");
}

export async function moveCursorUp() {
  await pressKey("ArrowUp");
}

// Keep navigation identical to navigateDefaultSchemaDocumentWithAssertions.
export async function navigateDefaultSchemaDocument() {
  await focusEditor();

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
  while (readSelection().blockId !== "start") {
    await moveCursorUp();
  }
}

// The page tab order can include the read-only editor before its inline link.
export async function focusReadOnlyLink() {
  const link = page.getByRole("link", { name: "Documentation", exact: true });
  while (document.activeElement !== link.element()) {
    await focusNextItem();
  }
  return link;
}
