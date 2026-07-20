/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for large-diff suggestions: adding and removing the
 * entire shared `testDocument` (every block type at once) as a single
 * suggestion — a stress test for the diff.
 *
 * SKIPPED in the browser: the suggestion fixture renders two full editors, and
 * the whole `testDocument` (40+ blocks, external video/audio media, each block
 * wrapped in nested suggestion marks) is heavy enough that the browser page
 * crashes on render ("page closed unexpectedly"), with or without a screenshot.
 * These large-diff scenarios ARE exercised (headless, no crash) by
 * `versioning.test`, which runs every gallery scenario through `enterPreview`.
 * The bodies below assert the diff structurally and are ready to un-skip if the
 * suggestion render gets lighter (e.g. virtualised) or the media is stubbed.
 */
import { SuggestionsExtension } from "@blocknote/core/y";
import { expect, test } from "vite-plus/test";

import {
  setupSuggestionTest,
  waitForSuggestion,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Scenario data is shared with the suggestion-gallery example so the gallery and
// these tests never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { SingleScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const addAll = scenarios.find(
  (s) => s.id === "large-diff-add-all",
) as SingleScenario;
const deleteAll = scenarios.find(
  (s) => s.id === "large-diff-delete-all",
) as SingleScenario;

const countBlocks = (xml: string) =>
  (xml.match(/<blockContainer/g) || []).length;

// A single-paragraph doc gets the whole testDocument inserted after it.
test.skip("suggestion mode: add a whole document (large diff)", async () => {
  const { editor, baseDoc, suggestionDoc, sync } = await setupSuggestionTest({
    userAction: "add whole document",
  });

  editor.replaceBlocks(editor.document, addAll.initial);
  await sync();
  // Base is just the single anchor paragraph.
  expect(countBlocks(ydocXml(baseDoc))).toBe(1);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  addAll.apply(editor);

  await waitForSuggestion(editor);

  // The suggestion doc now holds the anchor plus every testDocument block.
  expect(countBlocks(ydocXml(suggestionDoc))).toBeGreaterThan(20);
});

// A doc containing the whole testDocument is cleared to a single paragraph.
test.skip("suggestion mode: delete a whole document (large diff)", async () => {
  const { editor, baseDoc, suggestionDoc, sync } = await setupSuggestionTest({
    userAction: "delete whole document",
  });

  editor.replaceBlocks(editor.document, deleteAll.initial);
  await sync();
  // Base holds the whole testDocument.
  expect(countBlocks(ydocXml(baseDoc))).toBeGreaterThan(20);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  deleteAll.apply(editor);

  await waitForSuggestion(editor);

  // The suggestion doc collapses to the single replacement paragraph.
  const after = ydocXml(suggestionDoc);
  expect(after).toContain("all content removed");
  expect(countBlocks(after)).toBe(1);
});
