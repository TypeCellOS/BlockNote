/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for multi-column suggestions: creating a column
 * layout, removing a column, and adding a block inside a column. The gallery's
 * editor schema includes `@blocknote/xl-multi-column`, so these exercise the
 * `columnList` / `column` block types in suggestion mode. Same shape as the
 * other single-scenario categories.
 */
import { SuggestionsExtension } from "@blocknote/core/y";
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import {
  editorHtml,
  setupSuggestionTest,
  waitForSuggestion,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Scenario data is shared with the suggestion-gallery example so the gallery and
// these tests never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { SingleScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const createTwoColumns = scenarios.find(
  (s) => s.id === "create-2-columns",
) as SingleScenario;
const removeColumn = scenarios.find(
  (s) => s.id === "remove-1-column",
) as SingleScenario;
const removeMiddleColumn = scenarios.find(
  (s) => s.id === "remove-middle-column",
) as SingleScenario;
const addBlockToColumn = scenarios.find(
  (s) => s.id === "add-block-to-column",
) as SingleScenario;

// A paragraph gets a two-column layout inserted after it.
test("suggestion mode: create two columns", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "create 2 columns" });

  editor.replaceBlocks(editor.document, createTwoColumns.initial);
  await sync();
  await expectVisible(
    screen.getByTestId("editor-A").getByText("Intro paragraph"),
  );

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  createTwoColumns.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "multi-column-create-two",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="intro">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Intro paragraph</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="intro">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Intro paragraph</paragraph>
      </blockContainer>
      <columnList id="1">
        <column id="2" width="1">
          <blockContainer id="3">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Left column</paragraph>
          </blockContainer>
        </column>
        <column id="4" width="1">
          <blockContainer id="5">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Right column</paragraph>
          </blockContainer>
        </column>
      </columnList>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="intro">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">Intro paragraph</paragraph>
        </blockContainer>
        <y-attributed-insert userIds="">
          <columnList id="1">
            <y-attributed-insert userIds="">
              <column id="2" width="1">
                <y-attributed-insert userIds="">
                  <blockContainer id="3">
                    <y-attributed-insert userIds="">
                      <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                        <y-attributed-insert userIds="">Left column</y-attributed-insert>
                      </paragraph>
                    </y-attributed-insert>
                  </blockContainer>
                </y-attributed-insert>
              </column>
            </y-attributed-insert>
            <y-attributed-insert userIds="">
              <column id="4" width="1">
                <y-attributed-insert userIds="">
                  <blockContainer id="5">
                    <y-attributed-insert userIds="">
                      <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                        <y-attributed-insert userIds="">Right column</y-attributed-insert>
                      </paragraph>
                    </y-attributed-insert>
                  </blockContainer>
                </y-attributed-insert>
              </column>
            </y-attributed-insert>
          </columnList>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// A two-column layout loses one of its columns.
test("suggestion mode: remove a column", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "remove column" });

  editor.replaceBlocks(editor.document, removeColumn.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Right column"));

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  removeColumn.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "multi-column-remove-column",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <columnList id="cols">
        <column id="col-left" width="1">
          <blockContainer id="1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Left column</paragraph>
          </blockContainer>
        </column>
        <column id="col-right" width="1">
          <blockContainer id="2">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Right column</paragraph>
          </blockContainer>
        </column>
      </columnList>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Left column</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <y-attributed-delete userIds="">
          <columnList id="cols">
            <column id="col-left" width="1">
              <blockContainer id="1">
                <paragraph backgroundColor="default" textColor="default" textAlignment="left">Left column</paragraph>
              </blockContainer>
            </column>
            <column id="col-right" width="1">
              <blockContainer id="2">
                <paragraph backgroundColor="default" textColor="default" textAlignment="left">Right column</paragraph>
              </blockContainer>
            </column>
          </columnList>
        </y-attributed-delete>
        <y-attributed-insert userIds="">
          <blockContainer id="1">
            <y-attributed-insert userIds="">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert userIds="">Left column</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// A three-column layout loses a column.
test("suggestion mode: remove a column from three", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "drop one of three" });

  editor.replaceBlocks(editor.document, removeMiddleColumn.initial);
  await sync();
  await expectVisible(
    screen.getByTestId("editor-A").getByText("Middle column"),
  );

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  removeMiddleColumn.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "multi-column-remove-from-three",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <columnList id="cols">
        <column id="col-left" width="1">
          <blockContainer id="1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Left column</paragraph>
          </blockContainer>
        </column>
        <column id="col-middle" width="1">
          <blockContainer id="2">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Middle column</paragraph>
          </blockContainer>
        </column>
        <column id="col-right" width="1">
          <blockContainer id="3">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Right column</paragraph>
          </blockContainer>
        </column>
      </columnList>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <columnList id="cols">
        <column id="col-left" width="1">
          <blockContainer id="1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Left column</paragraph>
          </blockContainer>
        </column>
        <column id="col-middle" width="1">
          <blockContainer id="2">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Middle column</paragraph>
          </blockContainer>
        </column>
      </columnList>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <columnList id="cols">
          <column id="col-left" width="1">
            <blockContainer id="1">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">Left column</paragraph>
            </blockContainer>
          </column>
          <column id="col-middle" width="1">
            <blockContainer id="2">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">Middle column</paragraph>
            </blockContainer>
          </column>
          <y-attributed-delete userIds="">
            <column id="col-right" width="1">
              <blockContainer id="3">
                <paragraph backgroundColor="default" textColor="default" textAlignment="left">Right column</paragraph>
              </blockContainer>
            </column>
          </y-attributed-delete>
        </columnList>
      </blockGroup>
    </doc>"
  `);
});

// A paragraph is inserted inside one column of a two-column layout.
test("suggestion mode: add a block to a column", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add block to column" });

  editor.replaceBlocks(editor.document, addBlockToColumn.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Left column"));

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  addBlockToColumn.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "multi-column-add-block",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <columnList id="cols">
        <column id="col-left" width="1">
          <blockContainer id="left-p">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Left column</paragraph>
          </blockContainer>
        </column>
        <column id="col-right" width="1">
          <blockContainer id="1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Right column</paragraph>
          </blockContainer>
        </column>
      </columnList>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <columnList id="cols">
        <column id="col-left" width="1">
          <blockContainer id="left-p">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Left column</paragraph>
          </blockContainer>
          <blockContainer id="2">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Added to the left column</paragraph>
          </blockContainer>
        </column>
        <column id="col-right" width="1">
          <blockContainer id="1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Right column</paragraph>
          </blockContainer>
        </column>
      </columnList>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <columnList id="cols">
          <column id="col-left" width="1">
            <blockContainer id="left-p">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">Left column</paragraph>
            </blockContainer>
            <y-attributed-insert userIds="">
              <blockContainer id="2">
                <y-attributed-insert userIds="">
                  <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                    <y-attributed-insert userIds="">Added to the left column</y-attributed-insert>
                  </paragraph>
                </y-attributed-insert>
              </blockContainer>
            </y-attributed-insert>
          </column>
          <column id="col-right" width="1">
            <blockContainer id="1">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">Right column</paragraph>
            </blockContainer>
          </column>
        </columnList>
      </blockGroup>
    </doc>"
  `);
});
