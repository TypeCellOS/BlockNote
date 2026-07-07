/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for table suggestions: add / remove rows
 * and columns, edit cell content, change cell color, merge / split.
 * Same shape as the other categories.
 *
 * Table block is the one place in BlockNote where `y-attributed-*`
 * marks are declared on the block content node (see Table/block.ts),
 * so the suggestion infrastructure has the most schema support here.
 */
import { SuggestionsExtension } from "@blocknote/core/y";
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import {
  editorHtml,
  setupSuggestionTest,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Scenario data (the `initial` seed + the `apply` change) is shared with the
// suggestion-gallery example so the gallery and these tests never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { SingleScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const addRow = scenarios.find(
  (s) => s.id === "table-add-row",
) as SingleScenario;
const addColumn = scenarios.find(
  (s) => s.id === "table-add-column",
) as SingleScenario;
const removeRow = scenarios.find(
  (s) => s.id === "table-remove-row",
) as SingleScenario;
const removeColumn = scenarios.find(
  (s) => s.id === "table-remove-column",
) as SingleScenario;
const editCell = scenarios.find(
  (s) => s.id === "table-edit-cell",
) as SingleScenario;
const columnColor = scenarios.find(
  (s) => s.id === "table-column-color",
) as SingleScenario;
const mergeCells = scenarios.find(
  (s) => s.id === "table-merge-cells",
) as SingleScenario;
const splitCell = scenarios.find(
  (s) => s.id === "table-split-cell",
) as SingleScenario;

// Add a third row to a 2x2 table.
test("suggestion mode: add row", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add row" });

  editor.replaceBlocks(editor.document, addRow.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  addRow.apply(editor);

  await expect.poll(() => editor.document[0]?.children.length).toBe(0);
  await expectVisible(screen.getByTestId("editor-A").getByText("A3"));

  await expectScreenshot(screen.getByTestId("editor-root"), "table-add-row");

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Add a third column to a 2x2 table.
test("suggestion mode: add column", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add column" });

  editor.replaceBlocks(editor.document, addColumn.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  addColumn.apply(editor);

  await expectVisible(screen.getByTestId("editor-A").getByText("C1"));

  await expectScreenshot(screen.getByTestId("editor-root"), "table-add-column");

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Remove the second row from a 2x2 table.
test("suggestion mode: remove row", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "remove last row" });

  editor.replaceBlocks(editor.document, removeRow.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A2"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  removeRow.apply(editor);

  await expectScreenshot(screen.getByTestId("editor-root"), "table-remove-row");

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Remove the second column from a 2x2 table.
test("suggestion mode: remove column", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "remove last column" });

  editor.replaceBlocks(editor.document, removeColumn.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("B1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  removeColumn.apply(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "table-remove-column",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Change the text in cell (A1) -> (A1 edited).
test("suggestion mode: update text in cell", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "edit top-left cell" });

  editor.replaceBlocks(editor.document, editCell.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editCell.apply(editor);

  await expectVisible(screen.getByTestId("editor-A").getByText("edited"));

  await expectScreenshot(screen.getByTestId("editor-root"), "table-edit-cell");

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Change `backgroundColor` of every cell in the first column.
test("suggestion mode: change column background color", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "highlight first column" });

  editor.replaceBlocks(editor.document, columnColor.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  columnColor.apply(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "table-column-color",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Known issue — tracked in the suggestion gallery ("table-merge-cells"): the
// diff shows a phantom extra "deleted column".

// Merge two horizontally adjacent cells in the top row by setting
// colspan=2 on the first cell and dropping the second.
test("suggestion mode: merge two cells", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "merge top-row cells" });

  editor.replaceBlocks(editor.document, mergeCells.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  mergeCells.apply(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "table-merge-cells",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Start from a 2x2 table whose top-left cell has colspan=2, then
// split it back into two cells.
test("suggestion mode: split a merged cell", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "split top-row cell" });

  editor.replaceBlocks(editor.document, splitCell.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A1+B1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  splitCell.apply(editor);

  await expectScreenshot(screen.getByTestId("editor-root"), "table-split-cell");

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});
