/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for nesting-related suggestions: indent,
 * unindent, and type-change on a block that already has children.
 * Same shape as `propChanges.test.tsx`.
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

// Scenario data (the `initial` seed + the `apply` change) is shared with the
// suggestion-gallery example so the gallery and these tests never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { SingleScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const indentBlock = scenarios.find(
  (s) => s.id === "nesting-indent",
) as SingleScenario;
const unindentBlock = scenarios.find(
  (s) => s.id === "nesting-unindent",
) as SingleScenario;
const changeParentType = scenarios.find(
  (s) => s.id === "nesting-change-parent-type",
) as SingleScenario;

// Indent: take two sibling paragraphs and nest the second under the
// first.
test("suggestion mode: indent a block", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "indent N1" });

  editor.replaceBlocks(editor.document, indentBlock.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("N0"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  indentBlock.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(screen.getByTestId("editor-root"), "nesting-indent");

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  // Structural move encoded as insert-at-new-location + node-level
  // delete on the old location. The original N1 sibling at the bottom
  // is wrapped in `<y-attributed-delete>` (block-level mark) and the
  // new nested copy is wrapped in `<y-attributed-insert>` at several
  // levels. So accept/reject UI does have the data to render this
  // sensibly – the snapshot below is the source of truth.
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Unindent: nested child becomes a sibling of its parent.
test("suggestion mode: unindent a block", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "unindent N1" });

  editor.replaceBlocks(editor.document, unindentBlock.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("N0"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  unindentBlock.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(screen.getByTestId("editor-root"), "nesting-unindent");

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Change parent block's type while keeping its children.
test("suggestion mode: change block type of a block with children", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "parent → heading" });

  editor.replaceBlocks(editor.document, changeParentType.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("N0"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  changeParentType.apply(editor);

  // TODO: should this be editor.document[0], or expose .documentWithoutDeletions?
  await expect.poll(() => editor.document[1]?.type).toBe("heading");

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "nesting-change-parent-type",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});
