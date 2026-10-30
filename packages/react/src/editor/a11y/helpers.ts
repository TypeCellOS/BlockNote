import { expect } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { pressKey, readSelection } from "@root/tests/a11y/helpers.js";

// Shared by browser keyboard checks and the native transcript test.
export async function navigateDefaultSchemaDocument() {
  await pressKey("Tab");
  await expect.element(page.getByRole("textbox")).toHaveFocus();

  // Bound the traversal so a keyboard trap produces a useful failure instead
  // of an infinite loop. Selection endpoints prove the arrows actually moved.
  const visitedTableCells = new Set<string>();
  for (let step = 0; step < 120 && readSelection().blockId !== "end"; step++) {
    const { tableCell } = readSelection();
    if (tableCell) {
      visitedTableCells.add(`${tableCell.row},${tableCell.column}`);
    }
    // ArrowDown alone skips columns. Move through cell text and across each
    // row with ArrowRight, then resume ArrowDown from the final cell.
    await pressKey(
      tableCell && visitedTableCells.size < 4 ? "ArrowRight" : "ArrowDown",
    );
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

  for (
    let step = 0;
    step < 120 && readSelection().blockId !== "start";
    step++
  ) {
    await pressKey("ArrowUp");
  }
  expect(readSelection().blockId, "ArrowUp returns to the first block").toBe(
    "start",
  );
}

export function applyStyles(css: string) {
  const style = document.createElement("style");
  style.textContent = css;
  page.getByRole("main").element().append(style);
}

// Scaling text takes some logic as the scaling has to be applied to each font
// size, not just the base editor font size.
export function resizeText(scale: number) {
  function rulesFor(element: Element, selector: string): string {
    const rule =
      element instanceof HTMLElement
        ? `${selector} { font-size: ${Number.parseFloat(getComputedStyle(element).fontSize) * scale}px !important; }`
        : "";
    return [
      rule,
      ...Array.from(element.children, (child, index) =>
        rulesFor(child, `${selector} > :nth-child(${index + 1})`),
      ),
    ].join("\n");
  }

  // Read all sizes before applying overrides, so inherited sizes scale once.
  // A stylesheet avoids ProseMirror reconciling mutations to editable DOM.
  applyStyles(rulesFor(page.getByRole("textbox").element(), ".bn-editor"));
}
