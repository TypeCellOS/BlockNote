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
// Kept `test.fails` until the fix lands.
//
// NB: this throws synchronously in `sync()`, but it's invisible in a normal
// `.fails` run — vitest suppresses a passing (expected-fail) test's error output,
// so "Unexpected case" only shows in the log if you temporarily drop `.fails`.
test.fails("concurrent: A deletes a row, B adds a column", async () => {
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

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot();
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot();
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

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B3</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C2</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C2</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph></tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="table">
          <table textColor="default">
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>A1</tableParagraph>
              </tableCell>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>B1</tableParagraph>
              </tableCell>
              <y-attributed-insert userIds="B">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert userIds="B">
                    <tableParagraph>
                      <y-attributed-insert userIds="B">C1</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
            </tableRow>
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>A2</tableParagraph>
              </tableCell>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>B2</tableParagraph>
              </tableCell>
              <y-attributed-insert userIds="B">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert userIds="B">
                    <tableParagraph>
                      <y-attributed-insert userIds="B">C2</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
            </tableRow>
            <y-attributed-insert userIds="A">
              <tableRow>
                <y-attributed-insert userIds="A">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="A">
                      <tableParagraph>
                        <y-attributed-insert userIds="A">A3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert userIds="A">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="A">
                      <tableParagraph>
                        <y-attributed-insert userIds="A">B3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <tableParagraph></tableParagraph>
                </tableCell>
              </tableRow>
            </y-attributed-insert>
          </table>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
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

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B3</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B3</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="table">
          <table textColor="default">
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>A1</tableParagraph>
              </tableCell>
              <y-attributed-delete userIds="A">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <tableParagraph>B1</tableParagraph>
                </tableCell>
              </y-attributed-delete>
            </tableRow>
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>A2</tableParagraph>
              </tableCell>
              <y-attributed-delete userIds="A">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <tableParagraph>B2</tableParagraph>
                </tableCell>
              </y-attributed-delete>
            </tableRow>
            <y-attributed-insert userIds="B">
              <tableRow>
                <y-attributed-insert userIds="B">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="B">
                      <tableParagraph>
                        <y-attributed-insert userIds="B">A3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert userIds="B">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="B">
                      <tableParagraph>
                        <y-attributed-insert userIds="B">B3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
              </tableRow>
            </y-attributed-insert>
          </table>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
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

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C2</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C3</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>D1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>D2</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>D1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>D2</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph></tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="table">
          <table textColor="default">
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>A1</tableParagraph>
              </tableCell>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>B1</tableParagraph>
              </tableCell>
              <y-attributed-insert userIds="A">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert userIds="A">
                    <tableParagraph>
                      <y-attributed-insert userIds="A">C1</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
              <y-attributed-insert userIds="B">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert userIds="B">
                    <tableParagraph>
                      <y-attributed-insert userIds="B">D1</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
            </tableRow>
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>A2</tableParagraph>
              </tableCell>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>B2</tableParagraph>
              </tableCell>
              <y-attributed-insert userIds="A">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert userIds="A">
                    <tableParagraph>
                      <y-attributed-insert userIds="A">C2</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
              <y-attributed-insert userIds="B">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert userIds="B">
                    <tableParagraph>
                      <y-attributed-insert userIds="B">D2</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
            </tableRow>
            <y-attributed-insert userIds="A">
              <tableRow>
                <y-attributed-insert userIds="A">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="A">
                      <tableParagraph>
                        <y-attributed-insert userIds="A">A3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert userIds="A">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="A">
                      <tableParagraph>
                        <y-attributed-insert userIds="A">B3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert userIds="A">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="A">
                      <tableParagraph>
                        <y-attributed-insert userIds="A">C3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <tableParagraph></tableParagraph>
                </tableCell>
              </tableRow>
            </y-attributed-insert>
          </table>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
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

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C2</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C3</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>D1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>D2</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C2</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C3</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>D1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>D2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph></tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="table">
          <table textColor="default">
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>A1</tableParagraph>
              </tableCell>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>B1</tableParagraph>
              </tableCell>
              <y-attributed-insert userIds="A">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert userIds="A">
                    <tableParagraph>
                      <y-attributed-insert userIds="A">C1</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
            </tableRow>
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>A2</tableParagraph>
              </tableCell>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>B2</tableParagraph>
              </tableCell>
              <y-attributed-insert userIds="A">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert userIds="A">
                    <tableParagraph>
                      <y-attributed-insert userIds="A">C2</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
            </tableRow>
            <y-attributed-insert userIds="A">
              <tableRow>
                <y-attributed-insert userIds="A">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="A">
                      <tableParagraph>
                        <y-attributed-insert userIds="A">A3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert userIds="A">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="A">
                      <tableParagraph>
                        <y-attributed-insert userIds="A">B3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert userIds="A">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="A">
                      <tableParagraph>
                        <y-attributed-insert userIds="A">C3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
              </tableRow>
            </y-attributed-insert>
            <y-attributed-insert userIds="B">
              <tableRow>
                <y-attributed-insert userIds="B">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="B">
                      <tableParagraph>
                        <y-attributed-insert userIds="B">D1</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert userIds="B">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="B">
                      <tableParagraph>
                        <y-attributed-insert userIds="B">D2</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <tableParagraph></tableParagraph>
                </tableCell>
              </tableRow>
            </y-attributed-insert>
          </table>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
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

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C2</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B3</tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B1</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C1</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B2</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>C2</tableParagraph>
            </tableCell>
          </tableRow>
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>B3</tableParagraph>
            </tableCell>
            <tableCell
              backgroundColor="default"
              colspan="1"
              colwidth="null"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph></tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="table">
          <table textColor="default">
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>A1</tableParagraph>
              </tableCell>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>B1</tableParagraph>
              </tableCell>
              <y-attributed-insert userIds="A">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert userIds="A">
                    <tableParagraph>
                      <y-attributed-insert userIds="A">C1</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
            </tableRow>
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>A2</tableParagraph>
              </tableCell>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>B2</tableParagraph>
              </tableCell>
              <y-attributed-insert userIds="A">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert userIds="A">
                    <tableParagraph>
                      <y-attributed-insert userIds="A">C2</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
            </tableRow>
            <y-attributed-insert userIds="B">
              <tableRow>
                <y-attributed-insert userIds="B">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="B">
                      <tableParagraph>
                        <y-attributed-insert userIds="B">A3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert userIds="B">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert userIds="B">
                      <tableParagraph>
                        <y-attributed-insert userIds="B">B3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <tableParagraph></tableParagraph>
                </tableCell>
              </tableRow>
            </y-attributed-insert>
          </table>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});
