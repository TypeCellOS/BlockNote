/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for type-change suggestions: swapping the
 * block type (paragraph ↔ heading ↔ list item) while preserving its
 * inline content. Same shape as `propChanges.test.tsx`.
 */
import { SuggestionsExtension } from "@blocknote/core/y";
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import {
  editorHtml,
  setupSuggestionTest,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Scenario data (the `initial` seed + the `apply` change) is shared with the
// suggestion-gallery example so the gallery and these tests never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { SingleScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const listToParagraph = scenarios.find(
  (s) => s.id === "type-list-to-paragraph",
) as SingleScenario;
const paragraphToHeading = scenarios.find(
  (s) => s.id === "type-paragraph-to-heading",
) as SingleScenario;

// Demote a bullet-list item to a plain paragraph. Inline content
// "hello world" stays the same; only the wrapping node type changes.
test("suggestion mode: change list item to paragraph", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "list → paragraph" });

  editor.replaceBlocks(editor.document, listToParagraph.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("hello world"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  listToParagraph.apply(editor);

  // TODO: should this be editor.document[0], or expose .documentWithoutDeletions?
  await expect.poll(() => editor.document[1]?.type).toBe("paragraph");

  await expectScreenshot(
    screen.getByTestId("editor-root"),
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
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="block-hello">
            <bulletListItem
              backgroundColor="default"
              textColor="default"
              textAlignment="left"
            >hello world</bulletListItem>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="block-hello">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert
                  userIds=""
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >hello world</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// Promote a paragraph to a level-1 heading. Same inline content.
test("suggestion mode: change paragraph to heading", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "paragraph → heading" });

  editor.replaceBlocks(editor.document, paragraphToHeading.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("hello world"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  paragraphToHeading.apply(editor);

  // TODO: should this be editor.document[0], or expose .documentWithoutDeletions?
  await expect.poll(() => editor.document[1]?.type).toBe("heading");

  await expectScreenshot(
    screen.getByTestId("editor-root"),
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
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="block-hello">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">hello world</paragraph>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="block-hello">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <heading
                backgroundColor="default"
                textColor="default"
                textAlignment="left"
                level="1"
                isToggleable="false"
              >
                <y-attributed-insert
                  userIds=""
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >hello world</y-attributed-insert>
              </heading>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});
