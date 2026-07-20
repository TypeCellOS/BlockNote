/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for suggestion-mode editing. Each test
 * sets up a fresh editor + base/suggestion Y.Doc pair via
 * `setupSuggestionTest()`, applies an edit in suggestion mode, and
 * captures a screenshot plus inline XML snapshots of both Y.Docs and
 * the ProseMirror document. The PM doc is where the suggestion marks
 * live – the Y.Docs only carry the content of the different branches.
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

const renameWord = scenarios.find(
  (s) => s.id === "text-rename-word",
) as SingleScenario;
const addBold = scenarios.find(
  (s) => s.id === "text-add-bold",
) as SingleScenario;
const removeBold = scenarios.find(
  (s) => s.id === "text-remove-bold",
) as SingleScenario;
const addItalicToBold = scenarios.find(
  (s) => s.id === "text-add-italic-to-bold",
) as SingleScenario;

// Pure text edit: replace one word with another and confirm the diff
// is rendered as inline <ins>/<del> spans around the changed letters.
test("suggestion mode: 'hello world' -> 'hello universe'", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "rename last word" });

  // 1. Set the base doc to "hello world". The block id is pinned so the
  //    snapshots stay deterministic.
  editor.replaceBlocks(editor.document, renameWord.initial);

  // 2. Replay base updates into the suggestion doc so both docs start
  //    from the same state.
  await sync();

  await expectVisible(screen.getByTestId("editor-A").getByText("hello world"));

  // 3. Subsequent edits are recorded as suggestions instead of mutating
  //    the doc directly.
  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  // 4. Replace "world" with "universe" via updateBlock.
  renameWord.apply(editor);

  // Wait for the suggestion edit to land in the DOM (React commits the
  // re-render on the next frame; without this the screenshot can race
  // the update). "unive" only exists once "world" -> "universe" has
  // been split into <ins>/<del> spans, so this is a precise sentinel.
  await expectVisible(screen.getByTestId("editor-A").getByText("unive"));

  // 5a. Visual snapshot of the rendered editor.
  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "suggestion-mode-universe",
  );

  // 5b. Y.Doc XML – just the merged textual state; suggestion marks
  //     don't live here.
  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();

  // 5c. ProseMirror XML – this is where the suggestion marks
  //     (`y-attributed-insert` / `y-attributed-delete`) live.
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Format-only addition: text content stays the same but a style mark
// (bold) is added on top. Surfaces how suggestions track pure format
// changes via the `y-attributed-format` mark. All three suggestion
// marks (`y-attributed-insert` / `-delete` / `-format`) have a `toDOM`
// in SuggestionMarks.ts; the format mark renders a
// `<span data-type="modification">` which the editor CSS highlights, so
// the screenshot shows bold "world" with the blue suggestion marker.
test("suggestion mode: add bold to 'world'", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "bold 'world'" });

  // Base: plain "hello world".
  editor.replaceBlocks(editor.document, addBold.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("hello world"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  // Suggestion edit: bold the word "world" (content text is unchanged,
  // only the style differs).
  addBold.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "suggestion-mode-add-bold",
  );

  // The base ("hello world") and suggestion ("hello <bold>world</bold>")
  // YDoc snapshots differ here because `ydocXml` walks the deep delta
  // (`toDeltaDeep`), which surfaces per-run formatting marks that
  // `Y.XmlFragment.toString()` would otherwise drop.
  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Format-only removal: bold mark is stripped from an already-styled
// word, text content unchanged. Mirror of the add-bold case to check
// removal is handled symmetrically.
test("suggestion mode: remove bold from 'world'", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "unbold 'world'" });

  // Base: "hello " + bold "world".
  editor.replaceBlocks(editor.document, removeBold.initial);
  await sync();
  // Use the full paragraph text – the User A column heading also
  // contains the word "world", which would clash with getByText.
  await expectVisible(screen.getByTestId("editor-A").getByText("hello world"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  // Suggestion edit: strip bold from "world".
  removeBold.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "suggestion-mode-remove-bold",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Known issue — tracked in the suggestion gallery ("text-add-italic-to-bold"):
// the `y-attributed-format` mark wraps all marks on the range, not just the new
// one, so the snapshot below can't distinguish the added mark from existing ones.
//
// Format added on top of an existing format: bold "world" gets italic
// layered on (bold is preserved). Checks that suggestion attribution
// is recorded only for the new mark, not the pre-existing one.
test("suggestion mode: add italic to already-bold 'world'", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "italic on top of bold" });

  // Base: "hello " + bold "world".
  editor.replaceBlocks(editor.document, addItalicToBold.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("hello world"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  // Suggestion edit: add italic to "world" while keeping it bold.
  addItalicToBold.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "suggestion-mode-add-italic-to-bold",
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});
