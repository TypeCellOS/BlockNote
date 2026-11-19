import { expect } from "vite-plus/test";
import {
  renderTestEditor,
  defaultSchemaDocument,
  readDOMSelection,
} from "./BlockNoteView.browser.test.js";

// Navigation announcements omit block types, document structure, and a lot of other markup.
it.skip("default schema: arrow-key document navigation", async ({
  setupScreenReader,
  page,
}) => {
  await renderTestEditor(defaultSchemaDocument);
  const { getTranscript, pressKey } = await setupScreenReader(
    page.getByRole("button", { name: "Before editor", exact: true }),
  );
  await pressKey("Tab");

  // Allow repeated presses within text, but fail early if navigation gets stuck.
  const visitedTableCells = new Set<string>();
  for (let presses = 0; readDOMSelection().blockId !== "end"; presses++) {
    if (presses >= 100) {
      throw new Error(
        "Could not reach the final block after 100 arrow-key presses",
      );
    }
    const { tableCell } = readDOMSelection();
    if (tableCell) {
      visitedTableCells.add(`${tableCell.row},${tableCell.column}`);
    }
    // ArrowDown alone skips columns. Move through cell text and across each
    // row with ArrowRight, then resume ArrowDown from the final cell.
    if (tableCell && visitedTableCells.size < 4) {
      await pressKey("ArrowRight");
    } else {
      await pressKey("ArrowDown");
    }
  }
  for (let presses = 0; readDOMSelection().blockId !== "start"; presses++) {
    if (presses >= 100) {
      throw new Error(
        "Could not return to the first block after 100 ArrowUp presses",
      );
    }
    await pressKey("ArrowUp");
  }
  const transcript = await getTranscript();
  expect(transcript.length).toBeGreaterThan(0);
  expect(transcript).toMatchSnapshot();
});

// Keyboard whole-block selection is not implemented, so its announcements cannot be tested yet.
it.skip("whole-block selection is announced", async () => {
  // TODO: Once keyboard block selection exists, verify its type and scope are
  // communicated, and review the transcript before accepting a baseline.
  // TODO: Text selection, whole-document selection, and non-inline blocks.
});
