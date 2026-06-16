/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for two-user concurrent type-change
 * suggestions. Same shape as `propChanges.concurrent.test.tsx`.
 *
 * KNOWN BUG: see `typeChanges.test.tsx` – block-type changes in
 * suggestion mode currently throw in y-prosemirror's `deltaToPSteps`.
 * Both tests below are marked `test.fails`; when the upstream bug is
 * fixed they will flip red and we can capture proper snapshots.
 */
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import { setupConcurrentSuggestionTest } from "./fixtures/concurrentSuggestionFixture.js";
import { editorHtml, ydocXml } from "./fixtures/suggestionFixture.js";

// Two competing type changes on the same block: A wants a heading, B
// wants a list item.
test.fails("concurrent: A → heading, B → list item", async () => {
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

  userA.editor.replaceBlocks(userA.editor.document, [
    { id: "block-hello", type: "paragraph", content: "hello world" },
  ]);
  seed();
  await expectVisible(
    screen.getByTestId(userA.testId).getByText("hello world"),
  );

  enableSuggestions();

  const [blockA] = userA.editor.document;
  userA.editor.updateBlock(blockA, {
    type: "heading",
    props: { level: 1 },
  });

  const [blockB] = userB.editor.document;
  userB.editor.updateBlock(blockB, { type: "bulletListItem" });

  await expect.poll(() => userA.editor.document[0]?.type).toBe("heading");
  await expect
    .poll(() => userB.editor.document[0]?.type)
    .toBe("bulletListItem");

  sync();

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "concurrent-heading-vs-list",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot();
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot();
});

// Mixed: A does a text edit (no type change), B changes the type.
// Exercises the path where one user's suggestion is a regular text
// diff and the other's is a block-type swap.
test.fails("concurrent: A edits text, B → heading", async () => {
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

  userA.editor.replaceBlocks(userA.editor.document, [
    { id: "block-hello", type: "paragraph", content: "hello world" },
  ]);
  seed();
  await expectVisible(
    screen.getByTestId(userA.testId).getByText("hello world"),
  );

  enableSuggestions();

  const [blockA] = userA.editor.document;
  userA.editor.updateBlock(blockA, {
    type: "paragraph",
    content: "hello universe",
  });

  const [blockB] = userB.editor.document;
  userB.editor.updateBlock(blockB, {
    type: "heading",
    props: { level: 1 },
  });

  await expect
    .poll(() =>
      userA.editor.prosemirrorState.doc.toString().includes("y-attributed"),
    )
    .toBe(true);
  await expect.poll(() => userB.editor.document[0]?.type).toBe("heading");

  sync();

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "concurrent-text-edit-vs-heading",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot();
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot();
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot();
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot();
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot();
});
