/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for type-change suggestions: swapping the
 * block type (paragraph ↔ heading ↔ list item) while preserving its
 * inline content. Same shape as `propChanges.test.tsx`.
 *
 * KNOWN BUG: `editor.updateBlock(block, { type: ... })` in suggestion
 * mode currently throws `TransformError: No node at mark step's
 * position` from y-prosemirror's `deltaToPSteps`. Tests are marked
 * `test.fails` so they pass while the bug exists – when the
 * underlying issue is fixed, the tests will start passing for real
 * and `test.fails` will flip them red, signalling that snapshots need
 * to be captured.
 */
import { SuggestionsExtension } from "@blocknote/core/y";
import { expect, test } from "vitest";

import {
  editorHtml,
  setupSuggestionTest,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Demote a bullet-list item to a plain paragraph. Inline content
// "hello world" stays the same; only the wrapping node type changes.
test("suggestion mode: change list item to paragraph", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "list → paragraph" });

  editor.replaceBlocks(editor.document, [
    {
      id: "block-hello",
      type: "bulletListItem",
      content: "hello world",
    },
  ]);
  sync();
  await expect
    .element(screen.getByTestId("editor-A").getByText("hello world"))
    .toBeVisible();

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  const [block] = editor.document;
  editor.updateBlock(block, { type: "paragraph" });

  await expect.poll(() => editor.document[0]?.type).toBe("paragraph");

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
    "type-change-list-to-paragraph",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <bulletListItem
          backgroundColor="default"
          textAlignment="left"
          textColor="default"
        >hello world</bulletListItem>
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

// Promote a paragraph to a level-1 heading. Same inline content.
test("suggestion mode: change paragraph to heading", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "paragraph → heading" });

  editor.replaceBlocks(editor.document, [
    { id: "block-hello", type: "paragraph", content: "hello world" },
  ]);
  sync();
  await expect
    .element(screen.getByTestId("editor-A").getByText("hello world"))
    .toBeVisible();

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  const [block] = editor.document;
  editor.updateBlock(block, { type: "heading", props: { level: 1 } });

  await expect.poll(() => editor.document[0]?.type).toBe("heading");

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
    "type-change-paragraph-to-heading",
  );

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
        <heading
          backgroundColor="default"
          isToggleable="false"
          level="1"
          textAlignment="left"
          textColor="default"
        >hello world</heading>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="block-hello">
          <heading
            backgroundColor="default"
            textColor="default"
            textAlignment="left"
            level="1"
            isToggleable="false"
          >hello world</heading>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});
