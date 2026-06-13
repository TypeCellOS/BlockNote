/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for two-user concurrent table edits.
 * Same shape as the other `.concurrent.test.tsx` files.
 */
import { expect, test } from "vitest";

import { setupConcurrentSuggestionTest } from "./fixtures/concurrentSuggestionFixture.js";
import {
  editorHtml,
  waitForSuggestion,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Shared 2x2 starting table.
const TABLE_2X2 = {
  id: "table",
  type: "table" as const,
  content: {
    type: "tableContent" as const,
    rows: [{ cells: ["A1", "B1"] }, { cells: ["A2", "B2"] }],
  },
};

// A deletes the last row, B adds a third column. Two disjoint
// structural edits to the same table.
// The merged editor's afterTransaction throws
// `applyChangesetToDelta: Unexpected case` in y-prosemirror when
// these two suggestions sync, so this is marked `test.fails` until
// upstream supports this interleaving.
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

  userA.editor.replaceBlocks(userA.editor.document, [TABLE_2X2]);
  seed();
  await expect
    .element(screen.getByTestId(userA.testId).getByText("A1"))
    .toBeVisible();

  enableSuggestions();

  // A: drop row 2.
  userA.editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["A1", "B1"] }],
    },
  });

  // B: add a third column.
  userB.editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["A1", "B1", "C1"] }, { cells: ["A2", "B2", "C2"] }],
    },
  });

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
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

  userA.editor.replaceBlocks(userA.editor.document, [TABLE_2X2]);
  seed();
  await expect
    .element(screen.getByTestId(userA.testId).getByText("A1"))
    .toBeVisible();

  enableSuggestions();

  // A: add a third row.
  userA.editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        { cells: ["A1", "B1"] },
        { cells: ["A2", "B2"] },
        { cells: ["A3", "B3"] },
      ],
    },
  });

  // B: add a third column.
  userB.editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["A1", "B1", "C1"] }, { cells: ["A2", "B2", "C2"] }],
    },
  });

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
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
              <y-attributed-insert user-color="#30bced">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert user-color="#30bced">
                    <tableParagraph>
                      <y-attributed-insert user-color="#30bced">C1</y-attributed-insert>
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
              <y-attributed-insert user-color="#30bced">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert user-color="#30bced">
                    <tableParagraph>
                      <y-attributed-insert user-color="#30bced">C2</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
            </tableRow>
            <y-attributed-insert user-color="#30bced">
              <tableRow>
                <y-attributed-insert user-color="#30bced">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert user-color="#30bced">
                      <tableParagraph>
                        <y-attributed-insert user-color="#30bced">A3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert user-color="#30bced">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert user-color="#30bced">
                      <tableParagraph>
                        <y-attributed-insert user-color="#30bced">B3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert user-color="#30bced">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert user-color="#30bced">
                      <tableParagraph></tableParagraph>
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

  userA.editor.replaceBlocks(userA.editor.document, [TABLE_2X2]);
  seed();
  await expect
    .element(screen.getByTestId(userA.testId).getByText("A1"))
    .toBeVisible();

  enableSuggestions();

  // A: drop column B.
  userA.editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["A1"] }, { cells: ["A2"] }],
    },
  });

  // B: add a third row.
  userB.editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        { cells: ["A1", "B1"] },
        { cells: ["A2", "B2"] },
        { cells: ["A3", "B3"] },
      ],
    },
  });

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
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
              <y-attributed-delete user-color="#30bced">
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
              <y-attributed-delete user-color="#30bced">
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
            <y-attributed-insert user-color="#30bced">
              <tableRow>
                <y-attributed-insert user-color="#30bced">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert user-color="#30bced">
                      <tableParagraph>
                        <y-attributed-insert user-color="#30bced">A3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert user-color="#30bced">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert user-color="#30bced">
                      <tableParagraph>
                        <y-attributed-insert user-color="#30bced">B3</y-attributed-insert>
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

  userA.editor.replaceBlocks(userA.editor.document, [TABLE_2X2]);
  seed();
  await expect
    .element(screen.getByTestId(userA.testId).getByText("A1"))
    .toBeVisible();

  enableSuggestions();

  // A: add a third column.
  userA.editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["A1", "B1", "C1"] }, { cells: ["A2", "B2", "C2"] }],
    },
  });

  // B: add a third row.
  userB.editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        { cells: ["A1", "B1"] },
        { cells: ["A2", "B2"] },
        { cells: ["A3", "B3"] },
      ],
    },
  });

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
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
              <y-attributed-insert user-color="#30bced">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert user-color="#30bced">
                    <tableParagraph>
                      <y-attributed-insert user-color="#30bced">C1</y-attributed-insert>
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
              <y-attributed-insert user-color="#30bced">
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert user-color="#30bced">
                    <tableParagraph>
                      <y-attributed-insert user-color="#30bced">C2</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
            </tableRow>
            <y-attributed-insert user-color="#30bced">
              <tableRow>
                <y-attributed-insert user-color="#30bced">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert user-color="#30bced">
                      <tableParagraph>
                        <y-attributed-insert user-color="#30bced">A3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert user-color="#30bced">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert user-color="#30bced">
                      <tableParagraph>
                        <y-attributed-insert user-color="#30bced">B3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert user-color="#30bced">
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert user-color="#30bced">
                      <tableParagraph></tableParagraph>
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
