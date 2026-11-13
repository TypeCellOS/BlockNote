import { commands } from "@root/tests/src/utils/context.js";
import { page } from "vite-plus/test/browser";
import { afterEach, expect, test } from "vite-plus/test";
import {
  renderTestEditor,
  defaultSchemaDocument,
} from "./BlockNoteView.browser.test.js";

afterEach(async () => {
  try {
    const transcript = await commands.readTranscript();
    expect(transcript.length).toBeGreaterThan(0);
    expect(transcript).toMatchSnapshot();
  } finally {
    await commands.stopReader();
  }
});

// Navigation announcements omit block types, document structure, and a lot of other markup.
test.skip("default schema: arrow-key document navigation", async () => {
  await renderTestEditor(defaultSchemaDocument);
  await commands.startReader(
    page.getByRole("button", { name: "Before editor", exact: true }).selector,
  );
  await commands.pressKey("Tab");

  // Follow the document until its endpoint; an unreachable endpoint times out.
  const visitedTableCells = new Set<string>();
  while ((await commands.readSelection()).blockId !== "end") {
    const { tableCell } = await commands.readSelection();
    if (tableCell) {
      visitedTableCells.add(`${tableCell.row},${tableCell.column}`);
    }
    // ArrowDown alone skips columns. Move through cell text and across each
    // row with ArrowRight, then resume ArrowDown from the final cell.
    if (tableCell && visitedTableCells.size < 4) {
      await commands.pressKey("ArrowRight");
    } else {
      await commands.pressKey("ArrowDown");
    }
  }
  while ((await commands.readSelection()).blockId !== "start") {
    await commands.pressKey("ArrowUp");
  }
});

// Keyboard whole-block selection is not implemented, so its announcements cannot be tested yet.
test.skip("whole-block selection is announced", async () => {
  // TODO: Once keyboard block selection exists, verify its type and scope are
  // communicated, and review the transcript before accepting a baseline.
  // TODO: Text selection, whole-document selection, and non-inline blocks.
});
