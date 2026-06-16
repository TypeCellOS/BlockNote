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

// Shared 2x2 table baseline used by most of the tests below.
const TABLE_2X2 = {
  id: "table",
  type: "table" as const,
  content: {
    type: "tableContent" as const,
    rows: [{ cells: ["A1", "B1"] }, { cells: ["A2", "B2"] }],
  },
};

// Add a third row to a 2x2 table.
test("suggestion mode: add row", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add row" });

  editor.replaceBlocks(editor.document, [TABLE_2X2]);
  sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.updateBlock("table", {
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

// Add a third column to a 2x2 table.
test("suggestion mode: add column", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add column" });

  editor.replaceBlocks(editor.document, [TABLE_2X2]);
  sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["A1", "B1", "C1"] }, { cells: ["A2", "B2", "C2"] }],
    },
  });

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

  editor.replaceBlocks(editor.document, [TABLE_2X2]);
  sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A2"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["A1", "B1"] }],
    },
  });

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
            <y-attributed-delete user-color="#30bced">
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

  editor.replaceBlocks(editor.document, [TABLE_2X2]);
  sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("B1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["A1"] }, { cells: ["A2"] }],
    },
  });

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

  editor.replaceBlocks(editor.document, [TABLE_2X2]);
  sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["A1 edited", "B1"] }, { cells: ["A2", "B2"] }],
    },
  });

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
                  <y-attributed-insert user-color="#30bced">edited</y-attributed-insert>
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

  editor.replaceBlocks(editor.document, [TABLE_2X2]);
  sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        {
          cells: [
            {
              type: "tableCell",
              props: { backgroundColor: "yellow" },
              content: ["A1"],
            },
            { type: "tableCell", content: ["B1"] },
          ],
        },
        {
          cells: [
            {
              type: "tableCell",
              props: { backgroundColor: "yellow" },
              content: ["A2"],
            },
            { type: "tableCell", content: ["B2"] },
          ],
        },
      ],
    },
  });

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
              backgroundColor="yellow"
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
              backgroundColor="yellow"
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
                backgroundColor="yellow"
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
                backgroundColor="yellow"
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

// TODO: this is broken as it's an extra "deleted column" is shown

// Merge two horizontally adjacent cells in the top row by setting
// colspan=2 on the first cell and dropping the second.
test("suggestion mode: merge two cells", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "merge top-row cells" });

  editor.replaceBlocks(editor.document, [TABLE_2X2]);
  sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        {
          cells: [
            {
              type: "tableCell",
              props: { colspan: 2 },
              content: ["A1+B1"],
            },
          ],
        },
        { cells: ["A2", "B2"] },
      ],
    },
  });

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
                  <y-attributed-insert user-color="#30bced">+B1</y-attributed-insert>
                </tableParagraph>
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

  editor.replaceBlocks(editor.document, [
    {
      id: "table",
      type: "table",
      content: {
        type: "tableContent",
        rows: [
          {
            cells: [
              {
                type: "tableCell",
                props: { colspan: 2 },
                content: ["A1+B1"],
              },
            ],
          },
          { cells: ["A2", "B2"] },
        ],
      },
    },
  ]);
  sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("A1+B1"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["A1", "B1"] }, { cells: ["A2", "B2"] }],
    },
  });

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
                  <y-attributed-delete user-color="#30bced">+B1</y-attributed-delete>
                </tableParagraph>
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
                      <y-attributed-insert user-color="#30bced">B1</y-attributed-insert>
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
