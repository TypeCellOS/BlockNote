/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for two-user concurrent type-change
 * suggestions. Same shape as `propChanges.concurrent.test.tsx`.
 */
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import { setupConcurrentSuggestionTest } from "./fixtures/concurrentSuggestionFixture.js";
import { editorHtml, ydocXml } from "./fixtures/suggestionFixture.js";

// Scenario data (the `initial` seed + A's/B's `applyA`/`applyB` changes) is
// shared with the suggestion-gallery example so the two never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { ConcurrentScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const headingVsList = scenarios.find(
  (s) => s.id === "concurrent-heading-vs-list",
) as ConcurrentScenario;
const textVsHeading = scenarios.find(
  (s) => s.id === "concurrent-text-vs-heading",
) as ConcurrentScenario;

// Two competing type changes on the same block: A wants a heading, B
// wants a list item.
test("concurrent: A → heading, B → list item", async () => {
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
    userAAction: "→ heading",
    userBAction: "→ list item",
  });

  userA.editor.replaceBlocks(userA.editor.document, headingVsList.initial);
  seed();
  await expectVisible(
    screen.getByTestId(userA.testId).getByText("hello world"),
  );

  enableSuggestions();

  headingVsList.applyA(userA.editor);

  headingVsList.applyB(userB.editor);

  // TODO: should this be editor.document[0], or expose .documentWithoutDeletions?
  await expect.poll(() => userA.editor.document[1]?.type).toBe("heading");
  await expect
    .poll(() => userB.editor.document[1]?.type)
    .toBe("bulletListItem");

  sync();

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "concurrent-heading-vs-list",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchSnapshot();
  expect(editorHtml(merged.editor)).toMatchSnapshot();
});

// Mixed: A does a text edit (no type change), B changes the type.
// Exercises the path where one user's suggestion is a regular text
// diff and the other's is a block-type swap.
test("concurrent: A edits text, B → heading", async () => {
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
    userAAction: "world → universe",
    userBAction: "→ heading",
  });

  userA.editor.replaceBlocks(userA.editor.document, textVsHeading.initial);
  seed();
  await expectVisible(
    screen.getByTestId(userA.testId).getByText("hello world"),
  );

  enableSuggestions();

  textVsHeading.applyA(userA.editor);

  textVsHeading.applyB(userB.editor);

  await expect
    .poll(() =>
      userA.editor.prosemirrorState.doc.toString().includes("y-attributed"),
    )
    .toBe(true);
  // TODO: should this be editor.document[0], or expose .documentWithoutDeletions?
  await expect.poll(() => userB.editor.document[1]?.type).toBe("heading");

  sync();

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "concurrent-text-edit-vs-heading",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchSnapshot();
  expect(editorHtml(merged.editor)).toMatchSnapshot();
});
