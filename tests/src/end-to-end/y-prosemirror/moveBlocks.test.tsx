/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for move-block suggestions: relocating a
 * whole block (with or without children) using `moveBlocksUp` /
 * `moveBlocksDown`. Same shape as the other categories.
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

const moveParagraphUp = scenarios.find(
  (s) => s.id === "move-paragraph-up",
) as SingleScenario;
const moveParagraphWithChildren = scenarios.find(
  (s) => s.id === "move-paragraph-with-children",
) as SingleScenario;

// Move a plain paragraph one slot up. Base has three siblings; we
// move the middle one to the top.
test("suggestion mode: move paragraph up", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "move middle up" });

  editor.replaceBlocks(editor.document, moveParagraphUp.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("First"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  moveParagraphUp.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "move-paragraph-up",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Move a paragraph that has a nested child. The whole subtree should
// travel together.
test("suggestion mode: move paragraph with children", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "move parent + child up" });

  editor.replaceBlocks(editor.document, moveParagraphWithChildren.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("First"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  moveParagraphWithChildren.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "move-paragraph-with-children",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});
