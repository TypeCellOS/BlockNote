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

const addRow = scenarios.find((s) => s.id === "table-add-row")!;
const addColumn = scenarios.find((s) => s.id === "table-add-column")!;
const removeRow = scenarios.find((s) => s.id === "table-remove-row")!;
const removeColumn = scenarios.find((s) => s.id === "table-remove-column")!;
const editCell = scenarios.find((s) => s.id === "table-edit-cell")!;
const columnColor = scenarios.find((s) => s.id === "table-column-color")!;
const mergeCells = scenarios.find((s) => s.id === "table-merge-cells")!;
const splitCell = scenarios.find((s) => s.id === "table-split-cell")!;

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
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
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
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
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
            </tableRow>
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <tableRow>
                <y-attributed-insert
                  userIds=""
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert
                      userIds=""
                      user-color-light="#fff0c2"
                      user-color-dark="#8a6d1a"
                    >
                      <tableParagraph>
                        <y-attributed-insert
                          userIds=""
                          user-color-light="#fff0c2"
                          user-color-dark="#8a6d1a"
                        >A3</y-attributed-insert>
                      </tableParagraph>
                    </y-attributed-insert>
                  </tableCell>
                </y-attributed-insert>
                <y-attributed-insert
                  userIds=""
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >
                  <tableCell
                    textColor="default"
                    backgroundColor="default"
                    textAlignment="left"
                    colspan="1"
                    rowspan="1"
                  >
                    <y-attributed-insert
                      userIds=""
                      user-color-light="#fff0c2"
                      user-color-dark="#8a6d1a"
                    >
                      <tableParagraph>
                        <y-attributed-insert
                          userIds=""
                          user-color-light="#fff0c2"
                          user-color-dark="#8a6d1a"
                        >B3</y-attributed-insert>
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
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
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
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
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
              <y-attributed-insert
                userIds=""
                user-color-light="#fff0c2"
                user-color-dark="#8a6d1a"
              >
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert
                    userIds=""
                    user-color-light="#fff0c2"
                    user-color-dark="#8a6d1a"
                  >
                    <tableParagraph>
                      <y-attributed-insert
                        userIds=""
                        user-color-light="#fff0c2"
                        user-color-dark="#8a6d1a"
                      >C1</y-attributed-insert>
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
              <y-attributed-insert
                userIds=""
                user-color-light="#fff0c2"
                user-color-dark="#8a6d1a"
              >
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert
                    userIds=""
                    user-color-light="#fff0c2"
                    user-color-dark="#8a6d1a"
                  >
                    <tableParagraph>
                      <y-attributed-insert
                        userIds=""
                        user-color-light="#fff0c2"
                        user-color-dark="#8a6d1a"
                      >C2</y-attributed-insert>
                    </tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
            </tableRow>
          </table>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
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
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
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
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
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
            </tableRow>
            <y-attributed-delete
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
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
              </tableRow>
            </y-attributed-delete>
          </table>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
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
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
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
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
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
              <y-attributed-delete
                userIds=""
                user-color-light="#fff0c2"
                user-color-dark="#8a6d1a"
              >
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
              <y-attributed-delete
                userIds=""
                user-color-light="#fff0c2"
                user-color-dark="#8a6d1a"
              >
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
          </table>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
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
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
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
              <tableParagraph>A1 edited</tableParagraph>
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
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
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
                <tableParagraph>
                  A1
                  <y-attributed-insert
                    userIds=""
                    user-color-light="#fff0c2"
                    user-color-dark="#8a6d1a"
                  >edited</y-attributed-insert>
                </tableParagraph>
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
            </tableRow>
          </table>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
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
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="green"
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
              backgroundColor="green"
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
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="table">
          <table textColor="default">
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="green"
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
            </tableRow>
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="green"
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
            </tableRow>
          </table>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
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
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="2"
              colwidth="[null,null]"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1+B1</tableParagraph>
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
              <tableParagraph></tableParagraph>
            </tableCell>
          </tableRow>
        </table>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="table">
          <table textColor="default">
            <tableRow>
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="2"
                rowspan="1"
                colwidth=","
              >
                <tableParagraph>
                  A1
                  <y-attributed-insert
                    userIds=""
                    user-color-light="#fff0c2"
                    user-color-dark="#8a6d1a"
                  >+B1</y-attributed-insert>
                </tableParagraph>
              </tableCell>
              <y-attributed-delete
                userIds=""
                user-color-light="#fff0c2"
                user-color-dark="#8a6d1a"
              >
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
              <tableCell
                textColor="default"
                backgroundColor="default"
                textAlignment="left"
                colspan="1"
                rowspan="1"
              >
                <tableParagraph>B2</tableParagraph>
              </tableCell>
              <y-attributed-insert
                userIds=""
                user-color-light="#fff0c2"
                user-color-dark="#8a6d1a"
              >
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert
                    userIds=""
                    user-color-light="#fff0c2"
                    user-color-dark="#8a6d1a"
                  >
                    <tableParagraph></tableParagraph>
                  </y-attributed-insert>
                </tableCell>
              </y-attributed-insert>
            </tableRow>
          </table>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
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

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="table">
        <table textColor="default">
          <tableRow>
            <tableCell
              backgroundColor="default"
              colspan="2"
              colwidth="[null,null]"
              rowspan="1"
              textAlignment="left"
              textColor="default"
            >
              <tableParagraph>A1+B1</tableParagraph>
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
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
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
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
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
                <tableParagraph>
                  A1
                  <y-attributed-delete
                    userIds=""
                    user-color-light="#fff0c2"
                    user-color-dark="#8a6d1a"
                  >+B1</y-attributed-delete>
                </tableParagraph>
              </tableCell>
              <y-attributed-insert
                userIds=""
                user-color-light="#fff0c2"
                user-color-dark="#8a6d1a"
              >
                <tableCell
                  textColor="default"
                  backgroundColor="default"
                  textAlignment="left"
                  colspan="1"
                  rowspan="1"
                >
                  <y-attributed-insert
                    userIds=""
                    user-color-light="#fff0c2"
                    user-color-dark="#8a6d1a"
                  >
                    <tableParagraph>
                      <y-attributed-insert
                        userIds=""
                        user-color-light="#fff0c2"
                        user-color-dark="#8a6d1a"
                      >B1</y-attributed-insert>
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
            </tableRow>
          </table>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});
