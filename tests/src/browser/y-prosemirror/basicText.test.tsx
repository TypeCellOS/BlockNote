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
import { expect, test } from "vitest";

import {
  editorHtml,
  setupSuggestionTest,
  waitForSuggestion,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Pure text edit: replace one word with another and confirm the diff
// is rendered as inline <ins>/<del> spans around the changed letters.
test("suggestion mode: 'hello world' -> 'hello universe'", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "rename last word" });

  // 1. Set the base doc to "hello world". The block id is pinned so the
  //    snapshots stay deterministic.
  editor.replaceBlocks(editor.document, [
    { id: "block-hello", type: "paragraph", content: "hello world" },
  ]);

  // 2. Replay base updates into the suggestion doc so both docs start
  //    from the same state.
  sync();

  await expect
    .element(screen.getByTestId("editor-A").getByText("hello world"))
    .toBeVisible();

  // 3. Subsequent edits are recorded as suggestions instead of mutating
  //    the doc directly.
  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  // 4. Replace "world" with "universe" via updateBlock.
  const [block] = editor.document;
  editor.updateBlock(block, { type: "paragraph", content: "hello universe" });

  // Wait for the suggestion edit to land in the DOM (React commits the
  // re-render on the next frame; without this the screenshot can race
  // the update). "unive" only exists once "world" -> "universe" has
  // been split into <ins>/<del> spans, so this is a precise sentinel.
  await expect
    .element(screen.getByTestId("editor-A").getByText("unive"))
    .toBeVisible();

  // 5a. Visual snapshot of the rendered editor.
  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
    "suggestion-mode-universe",
  );

  // 5b. Y.Doc XML – just the merged textual state; suggestion marks
  //     don't live here.
  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">hello world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">hello universe</paragraph>
      </blockContainer>
    </blockGroup>"
  `);

  // 5c. ProseMirror XML – this is where the suggestion marks
  //     (`y-attributed-insert` / `y-attributed-delete`) live.
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="block-hello">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">hello universe</paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
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
  editor.replaceBlocks(editor.document, [
    { id: "block-hello", type: "paragraph", content: "hello world" },
  ]);
  sync();
  await expect
    .element(screen.getByTestId("editor-A").getByText("hello world"))
    .toBeVisible();

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  // Suggestion edit: bold the word "world" (content text is unchanged,
  // only the style differs).
  const [block] = editor.document;
  editor.updateBlock(block, {
    type: "paragraph",
    content: [
      { type: "text", text: "hello ", styles: {} },
      { type: "text", text: "world", styles: { bold: true } },
    ],
  });

  await waitForSuggestion(editor);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
    "suggestion-mode-add-bold",
  );

  // The base ("hello world") and suggestion ("hello <bold>world</bold>")
  // YDoc snapshots differ here because `ydocXml` walks the deep delta
  // (`toDeltaDeep`), which surfaces per-run formatting marks that
  // `Y.XmlFragment.toString()` would otherwise drop.
  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">hello world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">
          hello
          <bold>world</bold>
        </paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="block-hello">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">
            hello
            <bold>world</bold>
          </paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// Format-only removal: bold mark is stripped from an already-styled
// word, text content unchanged. Mirror of the add-bold case to check
// removal is handled symmetrically.
test("suggestion mode: remove bold from 'world'", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "unbold 'world'" });

  // Base: "hello " + bold "world".
  editor.replaceBlocks(editor.document, [
    {
      id: "block-hello",
      type: "paragraph",
      content: [
        { type: "text", text: "hello ", styles: {} },
        { type: "text", text: "world", styles: { bold: true } },
      ],
    },
  ]);
  sync();
  // Use the full paragraph text – the User A column heading also
  // contains the word "world", which would clash with getByText.
  await expect
    .element(screen.getByTestId("editor-A").getByText("hello world"))
    .toBeVisible();

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  // Suggestion edit: strip bold from "world".
  const [block] = editor.document;
  editor.updateBlock(block, {
    type: "paragraph",
    content: "hello world",
  });

  await waitForSuggestion(editor);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
    "suggestion-mode-remove-bold",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">
          hello
          <bold>world</bold>
        </paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">hello world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="block-hello">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">hello world</paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// TODO: the snapshot below reveals that `y-attributed-format` wraps
// *all* marks on the affected range, not just the newly added one.
// The PM XML shows
//   <y-attributed-format><italic><bold>world</bold></italic></...>
// so from the attribution data alone we can't tell which mark is new
// (italic) and which is pre-existing (bold). If accept/reject logic
// needs to revert only the new mark, this granularity is insufficient.
//
// Format added on top of an existing format: bold "world" gets italic
// layered on (bold is preserved). Checks that suggestion attribution
// is recorded only for the new mark, not the pre-existing one.
test("suggestion mode: add italic to already-bold 'world'", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "italic on top of bold" });

  // Base: "hello " + bold "world".
  editor.replaceBlocks(editor.document, [
    {
      id: "block-hello",
      type: "paragraph",
      content: [
        { type: "text", text: "hello ", styles: {} },
        { type: "text", text: "world", styles: { bold: true } },
      ],
    },
  ]);
  sync();
  await expect
    .element(screen.getByTestId("editor-A").getByText("hello world"))
    .toBeVisible();

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  // Suggestion edit: add italic to "world" while keeping it bold.
  const [block] = editor.document;
  editor.updateBlock(block, {
    type: "paragraph",
    content: [
      { type: "text", text: "hello ", styles: {} },
      { type: "text", text: "world", styles: { bold: true, italic: true } },
    ],
  });

  await waitForSuggestion(editor);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
    "suggestion-mode-add-italic-to-bold",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">
          hello
          <bold>world</bold>
        </paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">
          hello
          <italic>
            <bold>world</bold>
          </italic>
        </paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="block-hello">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">
            hello
            <italic>
              <bold>world</bold>
            </italic>
          </paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});
