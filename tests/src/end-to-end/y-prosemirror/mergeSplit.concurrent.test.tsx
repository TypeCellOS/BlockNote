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

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchSnapshot();
  expect(editorHtml(merged.editor)).toMatchSnapshot();
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

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchSnapshot();
  expect(editorHtml(merged.editor)).toMatchSnapshot();
});
