/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for two-user concurrent table edits.
 * Same shape as the other `.concurrent.test.tsx` files.
 */
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import { setupConcurrentSuggestionTest } from "./fixtures/concurrentSuggestionFixture.js";
import {
  editorHtml,
  waitForSuggestion,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Scenario data (the `initial` seed + A's/B's `applyA`/`applyB` changes) is
// shared with the suggestion-gallery example so the two never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { ConcurrentScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const deleteRowVsAddCol = scenarios.find(
  (s) => s.id === "concurrent-table-row-vs-column",
) as ConcurrentScenario;
const addRowVsAddCol = scenarios.find(
  (s) => s.id === "concurrent-table-row-and-column",
) as ConcurrentScenario;
const delColVsAddRow = scenarios.find(
  (s) => s.id === "concurrent-table-delcol-vs-addrow",
) as ConcurrentScenario;
const seqColThenRow = scenarios.find(
  (s) => s.id === "concurrent-table-seq-col-then-row",
) as ConcurrentScenario;
const seqRowThenCol = scenarios.find(
  (s) => s.id === "concurrent-table-seq-row-then-col",
) as ConcurrentScenario;
const addColVsAddRow = scenarios.find(
  (s) => s.id === "concurrent-table-addcol-vs-addrow",
) as ConcurrentScenario;

// A deletes the last row, B adds a third column. Two disjoint
// structural edits to the same table.
//
// Known issue — tracked in the suggestion gallery ("concurrent-table-row-vs-column").
// Skipped (not `test.fails`) because as of @y/prosemirror v2.0.0-6 the RDT
// `applyDelta` now CATCHES the Y-side "Error: Unexpected case" this case
// throws and retries the apply, which turns a single expected throw into a
// runaway loop that floods stderr (~500k identical warnings) and never lets
// the suite finish. Skip it until the underlying concurrent row-vs-column
// conflict is fixed.
test.skip("concurrent: A deletes a row, B adds a column", async () => {
  const {
    userA,
    userB,
    merged,
    baseDoc,
    suggestionDocA,
    suggestionDocB,
    suggestionDocMerged,
    screen,
    seed,
    enableSuggestions,
    sync,
  } = await setupConcurrentSuggestionTest({
    userAAction: "delete last row",
    userBAction: "add column",
  });

  userA.editor.replaceBlocks(userA.editor.document, deleteRowVsAddCol.initial);
  seed();
  await expectVisible(screen.getByTestId(userA.testId).getByText("A1"));

  enableSuggestions();

  deleteRowVsAddCol.applyA(userA.editor);

  deleteRowVsAddCol.applyB(userB.editor);

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "table-concurrent-row-vs-column",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchSnapshot();
  expect(editorHtml(merged.editor)).toMatchSnapshot();
});

// Both users grow the table in independent directions: A adds a
// third row, B adds a third column.
test("concurrent: A adds a row, B adds a column", async () => {
  const {
    userA,
    userB,
    merged,
    baseDoc,
    suggestionDocA,
    suggestionDocB,
    suggestionDocMerged,
    screen,
    seed,
    enableSuggestions,
    sync,
  } = await setupConcurrentSuggestionTest({
    userAAction: "add row",
    userBAction: "add column",
  });

  userA.editor.replaceBlocks(userA.editor.document, addRowVsAddCol.initial);
  seed();
  await expectVisible(screen.getByTestId(userA.testId).getByText("A1"));

  enableSuggestions();

  addRowVsAddCol.applyA(userA.editor);

  addRowVsAddCol.applyB(userB.editor);

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "table-concurrent-row-and-column",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchSnapshot();
  expect(editorHtml(merged.editor)).toMatchSnapshot();
});

// A deletes the last column, B adds a third row. Mirrors the
// `delete-row vs add-column` case along the other axis.
// The merge converges with B's column deleted and the new row
// inserted, captured in the snapshots below.
test("concurrent: A deletes a column, B adds a row", async () => {
  const {
    userA,
    userB,
    merged,
    baseDoc,
    suggestionDocA,
    suggestionDocB,
    suggestionDocMerged,
    screen,
    seed,
    enableSuggestions,
    sync,
  } = await setupConcurrentSuggestionTest({
    userAAction: "delete last column",
    userBAction: "add row",
  });

  userA.editor.replaceBlocks(userA.editor.document, delColVsAddRow.initial);
  seed();
  await expectVisible(screen.getByTestId(userA.testId).getByText("A1"));

  enableSuggestions();

  delColVsAddRow.applyA(userA.editor);

  delColVsAddRow.applyB(userB.editor);

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "table-concurrent-delete-column-vs-add-row",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchSnapshot();
  expect(editorHtml(merged.editor)).toMatchSnapshot();
});

// A makes two sequential structural edits in their own suggestion
// layer: A adds a third column, then adds a third row. Concurrently,
// B adds their own column (labelled "D"). Stacks two structural
// suggestions in A's layer against a separate column-add in B's.
test("sequential: A adds a column then a row, B adds a column", async () => {
  const {
    userA,
    userB,
    merged,
    baseDoc,
    suggestionDocA,
    suggestionDocB,
    suggestionDocMerged,
    screen,
    seed,
    enableSuggestions,
    sync,
  } = await setupConcurrentSuggestionTest({
    userAAction: "add column then row",
    userBAction: "add column",
  });

  userA.editor.replaceBlocks(userA.editor.document, seqColThenRow.initial);
  seed();
  await expectVisible(screen.getByTestId(userA.testId).getByText("A1"));

  enableSuggestions();

  seqColThenRow.applyA(userA.editor);

  await waitForSuggestion(userA.editor);

  seqColThenRow.applyB(userB.editor);

  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "table-sequential-add-column-then-row-b-adds-column",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchSnapshot();
  expect(editorHtml(merged.editor)).toMatchSnapshot();
});

// A makes two sequential structural edits in the other order: A adds
// a third row, then adds a third column. Concurrently, B adds their
// own row (labelled "D"). Mirror of the case above, with B growing
// the table along the other axis.
test("sequential: A adds a row then a column, B adds a row", async () => {
  const {
    userA,
    userB,
    merged,
    baseDoc,
    suggestionDocA,
    suggestionDocB,
    suggestionDocMerged,
    screen,
    seed,
    enableSuggestions,
    sync,
  } = await setupConcurrentSuggestionTest({
    userAAction: "add row then column",
    userBAction: "add row",
  });

  userA.editor.replaceBlocks(userA.editor.document, seqRowThenCol.initial);
  seed();
  await expectVisible(screen.getByTestId(userA.testId).getByText("A1"));

  enableSuggestions();

  seqRowThenCol.applyA(userA.editor);

  await waitForSuggestion(userA.editor);

  seqRowThenCol.applyB(userB.editor);

  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "table-sequential-add-row-then-column-b-adds-row",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchSnapshot();
  expect(editorHtml(merged.editor)).toMatchSnapshot();
});

// A adds a column, B adds a row. Mirror of `add-row + add-column`,
// just swapped per-user – CRDT should converge to the same 3x3.
test("concurrent: A adds a column, B adds a row", async () => {
  const {
    userA,
    userB,
    merged,
    baseDoc,
    suggestionDocA,
    suggestionDocB,
    suggestionDocMerged,
    screen,
    seed,
    enableSuggestions,
    sync,
  } = await setupConcurrentSuggestionTest({
    userAAction: "add column",
    userBAction: "add row",
  });

  userA.editor.replaceBlocks(userA.editor.document, addColVsAddRow.initial);
  seed();
  await expectVisible(screen.getByTestId(userA.testId).getByText("A1"));

  enableSuggestions();

  addColVsAddRow.applyA(userA.editor);

  addColVsAddRow.applyB(userB.editor);

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "table-concurrent-add-column-and-add-row",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchSnapshot();
  expect(editorHtml(merged.editor)).toMatchSnapshot();
});
