/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for two-user concurrent merge/split suggestions.
 * One user merges two blocks (Backspace at block start) or splits a block
 * (Enter mid-text) while the other edits the same block; `sync()` merges both
 * suggestions into the merged doc and we snapshot the converged state.
 *
 * These are known-limitation baselines — a block-structural merge/split
 * concurrent with an edit to the same block can't be reconciled by the current
 * (nested) document model, so the snapshots capture the current (lossy)
 * behaviour. Tracked in the suggestion gallery ("Merge / split").
 */
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import { setupConcurrentSuggestionTest } from "./fixtures/concurrentSuggestionFixture.js";
import {
  editorHtml,
  waitForSuggestion,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Scenario data is shared with the suggestion-gallery example so the gallery and
// these tests never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { ConcurrentScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const mergeVsEdit = scenarios.find(
  (s) => s.id === "concurrent-merge-vs-edit",
) as ConcurrentScenario;
const splitVsType = scenarios.find(
  (s) => s.id === "concurrent-split-vs-type",
) as ConcurrentScenario;

// A merges block B into A (Backspace at the start of B) while B edits block B.
test("concurrent: A merges B into A, B edits block B", async () => {
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
    userAAction: "merge B into A",
    userBAction: "edit block B",
  });

  userA.editor.replaceBlocks(userA.editor.document, mergeVsEdit.initial);
  seed();

  await expectVisible(screen.getByTestId(userA.testId).getByText("Second"));

  enableSuggestions();

  mergeVsEdit.applyA(userA.editor);
  mergeVsEdit.applyB(userB.editor);

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "merge-split-merge-vs-edit",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="a">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">First</paragraph>
      </blockContainer>
      <blockContainer id="b">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Second</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="a">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">FirstSecond</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="a">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">First</paragraph>
      </blockContainer>
      <blockContainer id="b">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Second (edited)</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="a">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">FirstSecond</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="a">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">
            First
            <y-attributed-insert userIds="A">Second</y-attributed-insert>
          </paragraph>
        </blockContainer>
        <y-attributed-delete userIds="A">
          <blockContainer id="b">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">Second</paragraph>
          </blockContainer>
        </y-attributed-delete>
      </blockGroup>
    </doc>"
  `);
});

// B splits the block in the middle (Enter) while A types at the end.
test("concurrent: B splits the block, A types at the end", async () => {
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
    userAAction: "type at end",
    userBAction: "split mid-text",
  });

  userA.editor.replaceBlocks(userA.editor.document, splitVsType.initial);
  seed();

  await expectVisible(
    screen.getByTestId(userA.testId).getByText("Hello world"),
  );

  enableSuggestions();

  splitVsType.applyA(userA.editor);
  splitVsType.applyB(userB.editor);

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "merge-split-split-vs-type",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Hello world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Hello world!</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Hello</paragraph>
      </blockContainer>
      <blockContainer id="1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Hello !</paragraph>
      </blockContainer>
      <blockContainer id="1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="p">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">
            Hello
            <y-attributed-delete userIds="B">world</y-attributed-delete>
            <y-attributed-insert userIds="A">!</y-attributed-insert>
          </paragraph>
        </blockContainer>
        <y-attributed-insert userIds="B">
          <blockContainer id="1">
            <y-attributed-insert userIds="B">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert userIds="B">world</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});
